import type {SqlDatabase,SqlResult} from './database';
import {appOrigin} from './config';
import {z} from 'zod';
import {type State,type Notice,defaultSettings} from '../app/domain';
import {type EmailDelivery,type EmailStatus,type MessagingSnapshot,whatsappPhone} from '../app/messaging-types';
import {AppError,type Actor} from './commands';
import {encryptApiKey,decryptApiKey} from './message-encryption';
import {defaultGmail,gmailRequest,gmailEndpoint,gmailError} from './gmail-bridge';
import {gmailScript} from './gmail-script';
const WORKSPACE='primary';
const now=()=>new Date().toISOString();
const email=z.string().trim().email().max(150);
const safeWindow=23*60*60*1000; // Resend retains idempotency keys for 24h; keep a safety margin.
type Connection={provider:'resend'|'gmail';endpoint:string|null;quota_remaining:number|null;encrypted_key:string;sender:string;enabled:number;revision:number;verified_at:string|null};
type Row={provider:'resend'|'gmail'|null;id:string;notice_id:string|null;loan_id:string;audience:string;recipient:string;recipient_name:string;phone:string;status:EmailStatus;subject:string;body:string;request_payload:string|null;connection_revision:number|null;attempts:number;provider_id:string|null;error:string|null;first_attempt_at:string|null;next_attempt_at:string|null;lease_token:string|null;lease_until:string|null;created_at:string;updated_at:string;checked_at:string|null;whatsapp_at:string|null};
const view=(r:Row):EmailDelivery=>({provider:r.provider,id:r.id,noticeId:r.notice_id,loanId:r.loan_id,audience:r.audience,recipient:r.recipient,recipientName:r.recipient_name,phone:r.phone,status:r.status,attempts:r.attempts,providerId:r.provider_id,error:r.error,createdAt:r.created_at,updatedAt:r.updated_at,checkedAt:r.checked_at,whatsappAt:r.whatsapp_at});
function owner(actor:Actor){if(actor.role!=='owner')throw new AppError('Somente a administradora pode gerenciar os envios.',403)}
const parse=<T>(schema:z.ZodType<T>,input:unknown):T=>{const r=schema.safeParse(input);if(!r.success)throw new AppError('Confira os campos da conexão e tente novamente.');return r.data};
function recipient(s:State,n:Notice){const m=s.merchants.find(m=>m.id===n.merchantId)!;const a=s.settings||defaultSettings;return n.audience==='Você'?{email:a.email,name:a.contact||a.name,phone:a.phone}:{email:m.email,name:m.contact||m.name,phone:m.phone}}
export function outboxInsert(db:SqlDatabase,s:State,n:Notice){
 const r=recipient(s,n);const address=email.safeParse(r.email).success?r.email.trim().toLowerCase():'';
 return db.prepare("INSERT INTO email_outbox (id,workspace_id,notice_id,loan_id,audience,recipient,recipient_name,phone,status,subject,body,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,CASE WHEN ?='' THEN 'missing_recipient' WHEN COALESCE((SELECT enabled FROM messaging_connections WHERE workspace_id=?),0)=1 THEN 'queued' ELSE 'awaiting_connection' END,?,?,?,?)")
  .bind('email-'+n.id,WORKSPACE,n.id,n.loanId,n.audience,address,r.name,r.phone,address,WORKSPACE,`${n.title} · ${n.loanId}`,n.body,n.at,n.at);
}
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function payload(row:Row,c:Connection){
 const link=appOrigin()+(row.audience==='Lojista'?'/portal':'/');
 const text=row.body+`\n\nAcompanhar no Elo: ${link}\nO acesso ao portal depende da liberação do seu e-mail pela assistência.`;
 return JSON.stringify({from:c.sender,to:[row.recipient],subject:row.subject,text,html:`<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f7f5;font-family:Arial,sans-serif;color:#263d33"><div style="max-width:600px;margin:24px auto;background:white;border:1px solid #dfe7e1;border-radius:16px;overflow:hidden"><div style="background:#163d30;padding:24px;color:#deedb4;font-size:28px;font-weight:bold">elo <span style="font-size:12px;color:white">PEÇAS & EMPRÉSTIMOS</span></div><div style="padding:28px"><h1 style="font-size:22px">${escapeHtml(row.subject)}</h1><p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(row.body)}</p><p style="margin-top:28px"><a href="${link}" style="background:#163d30;color:white;padding:12px 20px;border-radius:8px;display:inline-block;text-decoration:none">Acompanhar no Elo</a></p><p style="font-size:12px;color:#69786f">O portal exige acesso liberado para o seu e-mail. Receber esta mensagem não confirma o aceite das peças. Fale com a assistência se identificar alguma divergência.</p></div></div></body></html>`});
}
function providerError(status:number){return status===401||status===403?'Confira a chave de API, a permissão e o domínio do remetente no Resend.':status===429?'Limite do serviço atingido. A fila aguardará antes de tentar novamente.':status===409?'O serviço encontrou um conflito na identificação do envio. Confira o registro no Resend.':status>=500?'O serviço está temporariamente indisponível. A mensagem foi preservada.':'O serviço recusou a mensagem. Confira o remetente, o destinatário e a situação da conta no Resend.'}
export class Messaging{
 constructor(public db:SqlDatabase,private secret?:string,private transport:typeof fetch=fetch){}
 private async connection(){return this.db.prepare('SELECT encrypted_key,sender,enabled,revision,verified_at,provider,endpoint,quota_remaining FROM messaging_connections WHERE workspace_id=?').bind(WORKSPACE).first<Connection>()}
 private async row(id:string){const r=await this.db.prepare('SELECT * FROM email_outbox WHERE id=? AND workspace_id=?').bind(id,WORKSPACE).first<Row>();if(!r)throw new AppError('Mensagem não encontrada.',404);return r}
 async snapshot(actor:Actor):Promise<MessagingSnapshot>{owner(actor);const c=await this.connection();const rows=await this.db.prepare('SELECT * FROM email_outbox WHERE workspace_id=? ORDER BY created_at DESC,id DESC').bind(WORKSPACE).all<Row>();const setup=await this.db.prepare('SELECT sender FROM gmail_setups WHERE workspace_id=?').bind(WORKSPACE).first<{sender:string}>();return {gmailSetup:{sender:setup?.sender||defaultGmail,prepared:!!setup},connection:{provider:c?.provider||'gmail',endpoint:c?.endpoint||'',quotaRemaining:c?.quota_remaining??null,configured:!!c,enabled:!!c?.enabled,sender:c?.sender||'',revision:c?.revision||0,verifiedAt:c?.verified_at||null,encryptionReady:!!this.secret&&/^[a-f0-9]{64}$/i.test(this.secret)},deliveries:rows.results.map(view)}}
 async prepareGmail(actor:Actor,sender=defaultGmail){
  owner(actor);const address=parse(z.string().trim().email().max(150).refine(v=>v.toLowerCase().endsWith('@gmail.com')),sender).toLowerCase();
  const key=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');const encrypted=await encryptApiKey(key,this.secret);
  await this.db.prepare('INSERT INTO gmail_setups (workspace_id,sender,encrypted_secret,created_at) VALUES (?,?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET encrypted_secret=CASE WHEN gmail_setups.sender=excluded.sender THEN gmail_setups.encrypted_secret ELSE excluded.encrypted_secret END,sender=excluded.sender').bind(WORKSPACE,address,encrypted,now()).run();
 }
 async gmailCode(actor:Actor){
  owner(actor);const setup=await this.db.prepare('SELECT sender,encrypted_secret FROM gmail_setups WHERE workspace_id=?').bind(WORKSPACE).first<{sender:string;encrypted_secret:string}>();if(!setup)throw new AppError('Prepare a conexão Gmail primeiro.');return {sender:setup.sender,script:gmailScript(setup.sender,await decryptApiKey(setup.encrypted_secret,this.secret))};
 }
 async configureGmail(actor:Actor,input:unknown){
  owner(actor);const v=parse(z.object({endpoint:gmailEndpoint,revision:z.number().int().min(0)}),input);const old=await this.connection();if((old?.revision||0)!==v.revision)throw new AppError('A conexão mudou. Atualize a central antes de continuar.',409);
  const setup=await this.db.prepare('SELECT sender,encrypted_secret FROM gmail_setups WHERE workspace_id=?').bind(WORKSPACE).first<{sender:string;encrypted_secret:string}>();if(!setup)throw new AppError('Prepare a conexão e copie o código para o Google primeiro.');
  const key=await decryptApiKey(setup.encrypted_secret,this.secret);let reply;try{reply=await gmailRequest(v.endpoint,key,{action:'health',sender:setup.sender},this.transport)}catch(e){if(e instanceof AppError)throw e;throw new AppError('O Google não respondeu a tempo. A conexão anterior foi preservada. Tente novamente.',503)}
  if(!reply.ok)throw new AppError(gmailError(reply.code));if(reply.protocol!=='elo-gmail-1'||reply.sender!==setup.sender)throw new AppError('O script não confirmou a conta Gmail esperada.');
  const at=now();let result:SqlResult;
  if(old)result=await this.db.prepare("UPDATE messaging_connections SET encrypted_key=?,sender=?,provider='gmail',endpoint=?,quota_remaining=?,enabled=1,revision=revision+1,verified_at=?,updated_at=? WHERE workspace_id=? AND revision=?").bind(setup.encrypted_secret,setup.sender,v.endpoint,reply.quotaRemaining??null,at,at,WORKSPACE,v.revision).run();
  else result=await this.db.prepare("INSERT INTO messaging_connections (workspace_id,encrypted_key,sender,provider,endpoint,quota_remaining,enabled,revision,verified_at,updated_at) VALUES (?,?,?,'gmail',?,?,1,1,?,?) ON CONFLICT(workspace_id) DO NOTHING").bind(WORKSPACE,setup.encrypted_secret,setup.sender,v.endpoint,reply.quotaRemaining??null,at,at).run();
  if(!result.meta.changes)throw new AppError('A conexão foi alterada durante a verificação. Atualize a central.',409);
 }
 async configure(actor:Actor,input:unknown){
  owner(actor);const v=parse(z.object({sender:email,apiKey:z.string().trim().regex(/^re_[A-Za-z0-9_-]{10,200}$/).optional(),revision:z.number().int().min(0)}),input);
  const old=await this.connection();if((old?.revision||0)!==v.revision)throw new AppError('A conexão foi alterada em outro acesso. Atualize e confira novamente.',409);
  const apiKey=v.apiKey||(old?.provider==='resend'?await decryptApiKey(old.encrypted_key,this.secret):'');if(!apiKey)throw new AppError('Informe sua chave de API do Resend.');
  const sender=v.sender.toLowerCase();const domain=sender.split('@')[1];let after='';let verified=false;
  for(let page=0;page<10;page++){
   let response:Response;try{response=await this.transport('https://api.resend.com/domains?limit=100'+(after?'&after='+encodeURIComponent(after):''),{headers:{Authorization:'Bearer '+apiKey},signal:AbortSignal.timeout(6000)})}catch{throw new AppError('Não foi possível consultar o Resend. Sua conexão anterior foi preservada.',503)}
   if(!response.ok)throw new AppError('Não foi possível verificar o remetente. Use uma chave do Resend com acesso completo para consultar domínios e acompanhar entregas.');
   const data=await response.json() as {data?:{id:string;name:string;status:string}[];has_more?:boolean};const match=data.data?.find(d=>d.name.toLowerCase()===domain);
   if(match){verified=match.status==='verified';break}if(!data.has_more||!data.data?.length)break;after=data.data.at(-1)!.id;
  }
  if(!verified)throw new AppError('O domínio deste remetente ainda não está verificado no Resend. Verifique o domínio antes de ativar os envios.');
  const encrypted=await encryptApiKey(apiKey,this.secret);const at=now();let r:SqlResult;
  if(old)r=await this.db.prepare("UPDATE messaging_connections SET encrypted_key=?,sender=?,provider='resend',endpoint=NULL,quota_remaining=NULL,enabled=1,revision=revision+1,verified_at=?,updated_at=? WHERE workspace_id=? AND revision=?").bind(encrypted,sender,at,at,WORKSPACE,v.revision).run();
  else r=await this.db.prepare('INSERT INTO messaging_connections (workspace_id,encrypted_key,sender,enabled,revision,verified_at,updated_at) VALUES (?,?,?,1,1,?,?) ON CONFLICT(workspace_id) DO NOTHING').bind(WORKSPACE,encrypted,sender,at,at).run();
  if(!r.meta.changes)throw new AppError('A conexão mudou durante a gravação. Atualize a central.',409);
 }
 async pause(actor:Actor,enabled:boolean,revision:number){owner(actor);const r=await this.db.prepare('UPDATE messaging_connections SET enabled=?,updated_at=? WHERE workspace_id=? AND revision=?').bind(enabled?1:0,now(),WORKSPACE,revision).run();if(!r.meta.changes)throw new AppError('Atualize a conexão antes de continuar.',409)}
 async enqueue(actor:Actor,id:string){
  owner(actor);const c=await this.connection();if(!c?.enabled)throw new AppError('Ative a conexão de e-mail antes de enviar.');const row=await this.row(id);
  if(row.provider_id||!['awaiting_connection','failed'].includes(row.status))throw new AppError('Este envio não pode ser repetido neste estado.');
  if(!email.safeParse(row.recipient).success)throw new AppError('Confira o e-mail do destinatário.');
  if((row.connection_revision!==null&&row.connection_revision!==c.revision)||(row.first_attempt_at&&Date.now()-Date.parse(row.first_attempt_at)>safeWindow))throw new AppError('Confira o envio no serviço ou com o destinatário. O prazo de repetição segura ou a conexão mudou; este aviso não será repetido.',409);
  await this.db.prepare("UPDATE email_outbox SET status='queued',error=NULL,next_attempt_at=NULL,updated_at=? WHERE id=? AND workspace_id=? AND status IN ('awaiting_connection','failed')").bind(now(),id,WORKSPACE).run();
 }
 async cancel(actor:Actor,id:string){owner(actor);const r=await this.db.prepare("UPDATE email_outbox SET status='cancelled',error=NULL,updated_at=? WHERE id=? AND workspace_id=? AND attempts=0 AND status IN ('awaiting_connection','missing_recipient','queued')").bind(now(),id,WORKSPACE).run();if(!r.meta.changes)throw new AppError('Este envio já começou ou foi encerrado. Atualize a central.',409)}
 async refreshRecipient(actor:Actor,id:string,state:State){
  owner(actor);const row=await this.row(id);const n=state.notices.find(n=>n.id===row.notice_id);if(!n)throw new AppError('Aviso não encontrado.');const r=recipient(state,n);const address=email.safeParse(r.email).success?r.email.trim().toLowerCase():'';if(!address&&!whatsappPhone(r.phone))throw new AppError('Cadastre um e-mail ou WhatsApp válido nos dados do destinatário primeiro.');
  const result=await this.db.prepare("UPDATE email_outbox SET recipient=?,recipient_name=?,phone=?,status=?,updated_at=? WHERE id=? AND workspace_id=? AND attempts=0 AND status IN ('missing_recipient','awaiting_connection')").bind(address,r.name,r.phone,address?'awaiting_connection':'missing_recipient',now(),id,WORKSPACE).run();if(!result.meta.changes)throw new AppError('O destinatário de um envio iniciado não pode ser alterado.',409);
 }
 async prepareWhatsApp(actor:Actor,id:string){owner(actor);const row=await this.row(id);if(!whatsappPhone(row.phone))throw new AppError('Cadastre um WhatsApp válido para este destinatário.');await this.db.prepare('UPDATE email_outbox SET whatsapp_at=? WHERE id=? AND workspace_id=?').bind(now(),id,WORKSPACE).run()}
 async test(actor:Actor,id:string){
  owner(actor);if(!z.string().uuid().safeParse(id).success)throw new AppError('Identificação do teste inválida.');const c=await this.connection();if(!c?.enabled)throw new AppError('Conecte o e-mail antes de testar.');
  const existing=await this.db.prepare('SELECT id FROM email_outbox WHERE id=? AND workspace_id=?').bind('test-'+id,WORKSPACE).first();if(existing)return;
  const recent=await this.db.prepare("SELECT id FROM email_outbox WHERE workspace_id=? AND notice_id IS NULL AND created_at>? LIMIT 1").bind(WORKSPACE,new Date(Date.now()-60000).toISOString()).first();if(recent)throw new AppError('Aguarde um minuto antes de solicitar outro teste.',429);
  const at=now();const result=await this.db.prepare("INSERT INTO email_outbox (id,workspace_id,notice_id,loan_id,audience,recipient,recipient_name,phone,status,subject,body,created_at,updated_at) SELECT ?,?,NULL,'Teste','Você',?,?,'','queued',?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM email_outbox WHERE workspace_id=? AND notice_id IS NULL AND created_at>?) ON CONFLICT(id) DO NOTHING").bind('test-'+id,WORKSPACE,actor.email.toLowerCase(),actor.name,'Seu e-mail está conectado ao Elo','Este é um teste solicitado pela administradora. Os próximos avisos de empréstimo poderão ser enviados pelo e-mail configurado no Elo.',at,at,WORKSPACE,new Date(Date.now()-60000).toISOString()).run();if(!result.meta.changes&&!await this.db.prepare('SELECT id FROM email_outbox WHERE id=? AND workspace_id=?').bind('test-'+id,WORKSPACE).first())throw new AppError('Aguarde um minuto antes de solicitar outro teste.',429);
 }
 async process(){
  const c=await this.connection();if(!c?.enabled)return;
  let apiKey:string;try{apiKey=await decryptApiKey(c.encrypted_key,this.secret)}catch{return}
  const at=now();
  await this.db.prepare("UPDATE email_outbox SET status=CASE WHEN first_attempt_at<? OR attempts>=5 THEN 'uncertain' ELSE 'queued' END,error='A tentativa anterior foi interrompida. O sistema preservou sua identificação.',lease_token=NULL,lease_until=NULL,updated_at=? WHERE workspace_id=? AND status='sending' AND lease_until<?").bind(new Date(Date.now()-safeWindow).toISOString(),at,WORKSPACE,at).run();
  const rows=await this.db.prepare("SELECT * FROM email_outbox WHERE workspace_id=? AND status='queued' AND (next_attempt_at IS NULL OR next_attempt_at<=?) ORDER BY created_at,id LIMIT 2").bind(WORKSPACE,at).all<Row>();
  for(const row of rows.results){
   if((row.connection_revision!==null&&row.connection_revision!==c.revision)||(row.first_attempt_at&&Date.now()-Date.parse(row.first_attempt_at)>safeWindow)){
    await this.db.prepare("UPDATE email_outbox SET status='uncertain',error='Confira o envio: o prazo seguro ou a conexão de envio mudou.',updated_at=? WHERE id=? AND status='queued'").bind(now(),row.id).run();continue;
   }
   const suppressed=await this.db.prepare("SELECT id FROM email_outbox WHERE workspace_id=? AND recipient=? AND status IN ('complained','bounced') LIMIT 1").bind(WORKSPACE,row.recipient).first();
   if(suppressed){await this.db.prepare("UPDATE email_outbox SET status='failed',error='Endereço bloqueado após devolução ou marcação como spam. Corrija o contato antes de gerar outro aviso.',updated_at=? WHERE id=? AND status='queued'").bind(now(),row.id).run();continue}
   const token=crypto.randomUUID();const started=now();const requestPayload=row.request_payload||payload(row,c);
   const claimed=await this.db.prepare("UPDATE email_outbox SET status='sending',attempts=attempts+1,provider=COALESCE(provider,?),request_payload=?,connection_revision=COALESCE(connection_revision,?),first_attempt_at=COALESCE(first_attempt_at,?),lease_token=?,lease_until=?,updated_at=? WHERE id=? AND workspace_id=? AND status='queued' AND EXISTS(SELECT 1 FROM messaging_connections WHERE workspace_id=? AND enabled=1 AND revision=?)")
    .bind(c.provider,requestPayload,c.revision,started,token,new Date(Date.now()+30000).toISOString(),started,row.id,WORKSPACE,WORKSPACE,c.revision).run();if(!claimed.meta.changes)continue;
   let status:EmailStatus='accepted';let providerId:string|null=null;let error:string|null=null;let next:string|null=null;let knownUnsent=false;
   try{
    if(c.provider==='gmail'){
     const result=await gmailRequest(c.endpoint||'',apiKey,{action:'send',sender:c.sender,id:row.id,email:JSON.parse(requestPayload)},this.transport);
     if(result.ok&&result.status==='sent'&&result.id===row.id){status='sent';providerId=row.id}
     else{error=gmailError(result.code);if(result.code==='quota'||result.code==='busy'){status='queued';knownUnsent=true;next=new Date(Date.now()+(result.code==='quota'?3600000:60000)).toISOString()}else if(['uncertain','conflict'].includes(result.code||''))status='uncertain';else if(result.code==='unavailable'){status=row.attempts>=4?'uncertain':'queued';next=new Date(Date.now()+60000*2**Math.min(row.attempts,5)).toISOString()}else status='failed'}
     if(result.quotaRemaining!==undefined)await this.db.prepare("UPDATE messaging_connections SET quota_remaining=? WHERE workspace_id=? AND revision=? AND provider='gmail'").bind(result.quotaRemaining,WORKSPACE,c.revision).run();
    }else{
    const response=await this.transport('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'elo/'+row.id},body:requestPayload,signal:AbortSignal.timeout(6000)});
    if(response.ok){const value=await response.json() as {id?:unknown};if(typeof value.id!=='string'||!z.string().uuid().safeParse(value.id).success)throw Error('Invalid provider response');providerId=value.id}
    else{error=providerError(response.status);if(response.status===429||response.status>=500){status=row.attempts>=4?'uncertain':'queued';next=new Date(Date.now()+Math.min(3600000,60000*2**row.attempts)).toISOString()}else status='failed'}
    }
   }catch{status=row.attempts>=4?'uncertain':'queued';error='O serviço não confirmou a solicitação. Uma nova tentativa manterá a mesma identificação.';next=new Date(Date.now()+60000*2**Math.min(row.attempts,5)).toISOString()}
   await this.db.prepare('UPDATE email_outbox SET status=?,provider_id=?,error=?,next_attempt_at=?,first_attempt_at=CASE WHEN ?=1 THEN NULL ELSE first_attempt_at END,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=?').bind(status,providerId,error,next,knownUnsent?1:0,now(),row.id,token).run();
  }
 }
 async refreshStatuses(actor:Actor){
  owner(actor);const row=await this.db.prepare("SELECT id FROM email_outbox WHERE workspace_id=? AND status IN ('accepted','delivered') AND (provider='resend' OR provider IS NULL) AND provider_id IS NOT NULL AND created_at>? AND (checked_at IS NULL OR checked_at<?) ORDER BY COALESCE(checked_at,created_at) LIMIT 1").bind(WORKSPACE,new Date(Date.now()-7*86400000).toISOString(),new Date(Date.now()-120000).toISOString()).first<{id:string}>();if(row)try{await this.check(actor,row.id)}catch{/* Preserve delivery state when provider is unavailable. */}
 }
 async check(actor:Actor,id:string){
  owner(actor);const row=await this.row(id);if(row.provider==='gmail')throw new AppError('O Gmail confirma o envio, mas não disponibiliza confirmação de entrega nesta conexão.');if(!row.provider_id)throw new AppError('O serviço ainda não confirmou a aceitação deste envio.');
  if(row.checked_at&&Date.now()-Date.parse(row.checked_at)<15000)return;
  const c=await this.connection();if(!c||c.revision!==row.connection_revision)throw new AppError('A conexão foi substituída. Consulte este envio no painel do Resend.');
  const apiKey=await decryptApiKey(c.encrypted_key,this.secret);let response:Response;
  try{response=await this.transport('https://api.resend.com/emails/'+encodeURIComponent(row.provider_id),{headers:{Authorization:'Bearer '+apiKey},signal:AbortSignal.timeout(6000)})}catch{throw new AppError('Não foi possível consultar a entrega agora. O estado anterior foi preservado.',503)}
  if(!response.ok)throw new AppError(providerError(response.status));const data=await response.json() as {last_event?:string};
  const status:EmailStatus=({delivered:'delivered',opened:'delivered',clicked:'delivered',bounced:'bounced',complained:'complained',failed:'failed',suppressed:'failed',canceled:'cancelled'} as Record<string,EmailStatus>)[data.last_event||'']||row.status;
  const error=status==='failed'?'O serviço informou falha ou supressão. Consulte o motivo no Resend.':status==='bounced'?'A mensagem foi recusada pelo servidor do destinatário.':status==='complained'?'O destinatário marcou a mensagem como spam.':null;
  await this.db.prepare('UPDATE email_outbox SET status=?,error=?,checked_at=?,updated_at=? WHERE id=? AND workspace_id=?').bind(status,error,now(),now(),id,WORKSPACE).run();
 }
}
