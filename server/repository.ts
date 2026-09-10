import {type State,type Loan,type LoanItem,type Event,type Merchant,type Settings,emptyState,defaultSettings} from '../app/domain';
import {type Actor,AppError,applyCommand} from './commands';
import {outboxInsert} from './outbox';
export const WORKSPACE='primary';
// The current Sites policy authorizes this owner. Once initialized, the stable Site user ID owns the data.
const BOOTSTRAP_OWNER_EMAIL='lopesleticia297@gmail.com';
type User={userId:string;email:string;displayName:string};
type Row={payload:string;[key:string]:unknown};
export type Snapshot={state:State;revision:number;actor:Actor};
const j=JSON.stringify;
const fromRows=<T>(rows:Row[])=>rows.map(r=>JSON.parse(r.payload) as T);
export class Repository{
 constructor(public db:D1Database){}
 async actor(user:User):Promise<Actor>{
  let workspace=await this.db.prepare('SELECT owner_id, owner_email FROM workspaces WHERE id=?').bind(WORKSPACE).first<{owner_id:string;owner_email:string}>();
  if(!workspace){
   if(user.email.toLowerCase()!==BOOTSTRAP_OWNER_EMAIL)throw new AppError('A assistência ainda precisa ser configurada pela proprietária.',403);
   await this.db.prepare('INSERT INTO workspaces (id,owner_id,owner_email,revision,last_command,settings,created_at) VALUES (?,?,?,0,?,?,?) ON CONFLICT(id) DO NOTHING').bind(WORKSPACE,user.userId,user.email.toLowerCase(),'',j({...defaultSettings,email:user.email}),new Date().toISOString()).run();
   workspace=await this.db.prepare('SELECT owner_id, owner_email FROM workspaces WHERE id=?').bind(WORKSPACE).first<{owner_id:string;owner_email:string}>();
  }
  if(workspace?.owner_id===user.userId)return {id:user.userId,email:user.email,name:user.displayName,role:'owner'};
  const m=await this.db.prepare('SELECT id,portal_user_id FROM merchants WHERE workspace_id=? AND email=? AND portal_enabled=1').bind(WORKSPACE,user.email.toLowerCase()).first<{id:string;portal_user_id:string|null}>();
  if(!m)throw new AppError('Seu e-mail não está habilitado para o portal de um lojista.',403);
  if(m.portal_user_id&&m.portal_user_id!==user.userId)throw new AppError('Este cadastro está associado a outra identidade. Fale com a assistência.',403);
  if(!m.portal_user_id)await this.db.prepare('UPDATE merchants SET portal_user_id=? WHERE id=? AND portal_enabled=1 AND email=? AND portal_user_id IS NULL').bind(user.userId,m.id,user.email.toLowerCase()).run();
  const verified=await this.db.prepare('SELECT portal_user_id FROM merchants WHERE id=? AND portal_enabled=1 AND email=?').bind(m.id,user.email.toLowerCase()).first<{portal_user_id:string}>();
  if(verified?.portal_user_id!==user.userId)throw new AppError('Não foi possível validar o acesso do lojista.',403);
  return {id:user.userId,email:user.email,name:user.displayName,role:'merchant',merchantId:m.id};
 }
 async read(actor:Actor):Promise<Snapshot>{
  const sql=[
   'SELECT revision,settings FROM workspaces WHERE id=?',
   'SELECT payload FROM pieces WHERE workspace_id=? ORDER BY sku',
   'SELECT payload FROM merchants WHERE workspace_id=? ORDER BY name_key',
   'SELECT payload FROM loans WHERE workspace_id=? ORDER BY id DESC',
   'SELECT i.payload,i.loan_id FROM loan_items i INNER JOIN loans l ON l.id=i.loan_id WHERE l.workspace_id=?',
   'SELECT e.payload,e.loan_id FROM loan_events e INNER JOIN loans l ON l.id=e.loan_id WHERE l.workspace_id=? ORDER BY e.at,e.id',
   'SELECT payload FROM receivables WHERE workspace_id=? ORDER BY rowid DESC',
   'SELECT payload FROM notices WHERE workspace_id=? ORDER BY at DESC,rowid DESC',
   'SELECT payload FROM movements WHERE workspace_id=? ORDER BY at DESC,rowid DESC',
   'SELECT payload FROM payments WHERE workspace_id=? ORDER BY rowid DESC'
  ];
  const r=await this.db.batch(sql.map(q=>this.db.prepare(q).bind(WORKSPACE)));
  const w=r[0].results?.[0] as {revision:number;settings:string}|undefined;if(!w)throw new AppError('Assistência não encontrada.',404);
  const items=new Map<string,LoanItem[]>();for(const row of r[4].results as Row[]){const key=String(row.loan_id);items.set(key,[...(items.get(key)||[]),JSON.parse(row.payload)])}
  const events=new Map<string,Event[]>();for(const row of r[5].results as Row[]){const key=String(row.loan_id);events.set(key,[...(events.get(key)||[]),JSON.parse(row.payload)])}
  const s:State={pieces:fromRows(r[1].results as Row[]),merchants:fromRows(r[2].results as Row[]),loans:fromRows<Loan>(r[3].results as Row[]).map(l=>({...l,items:items.get(l.id)||[],events:events.get(l.id)||[]})),receivables:fromRows(r[6].results as Row[]),notices:fromRows(r[7].results as Row[]),movements:fromRows(r[8].results as Row[]),payments:fromRows(r[9].results as Row[]),settings:JSON.parse(w.settings)};
  return {state:s,revision:w.revision,actor};
 }
 async execute(actor:Actor,id:string,revision:number,input:unknown):Promise<Snapshot&{result:Record<string,string|number|boolean>}>{
  const bytes=new TextEncoder().encode(j({actor:actor.id,command:input}));const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const lookup=async()=>this.db.prepare('SELECT fingerprint,result FROM commands WHERE id=? AND workspace_id=?').bind(id,WORKSPACE).first<{fingerprint:string;result:string}>();
  const cached=await lookup();if(cached){if(cached.fingerprint!==digest)throw new AppError('Este identificador já foi usado para outra operação.',409);return {...await this.read(actor),result:JSON.parse(cached.result)}}
  const before=await this.read(actor);if(before.revision!==revision)throw new AppError('Os dados foram atualizados em outro acesso. Revise os valores e confirme novamente.',409);
  const output=applyCommand(before.state,input,actor);const next=output.state;const c=input as {kind:string};
  if(j(next)===j(before.state))return {...before,result:output.result};
  const statements:D1PreparedStatement[]=[
   this.db.prepare('UPDATE workspaces SET revision=revision+1,last_command=?,settings=? WHERE id=? AND revision=?').bind(id,j(next.settings||defaultSettings),WORKSPACE,revision),
   this.db.prepare('INSERT INTO commands (id,workspace_id,fingerprint,actor_id,actor_name,kind,revision,result,at,guard) VALUES (?,?,?,?,?,?,?,?,?,COALESCE((SELECT CASE WHEN revision=? AND last_command=? THEN 1 ELSE 0 END FROM workspaces WHERE id=?),0))').bind(id,WORKSPACE,digest,actor.id,actor.name,c.kind,revision+1,j(output.result),new Date().toISOString(),revision+1,id,WORKSPACE)
  ];
  const diff=<T extends {id:string}>(old:T[],now:T[],write:(item:T)=>D1PreparedStatement)=>{const map=new Map(old.map(x=>[x.id,j(x)]));for(const item of now)if(map.get(item.id)!==j(item))statements.push(write(item))};
  diff(before.state.pieces,next.pieces,p=>this.db.prepare('INSERT INTO pieces (id,workspace_id,sku,available,quarantine,payload) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,available=excluded.available,quarantine=excluded.quarantine,payload=excluded.payload').bind(p.id,WORKSPACE,p.sku,p.available,p.quarantine,j(p)));
  diff(before.state.merchants,next.merchants,m=>this.db.prepare('INSERT INTO merchants (id,workspace_id,name_key,email,portal_enabled,payload) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name_key=excluded.name_key,portal_user_id=CASE WHEN merchants.email=excluded.email AND excluded.portal_enabled=1 THEN merchants.portal_user_id ELSE NULL END,email=excluded.email,portal_enabled=excluded.portal_enabled,payload=excluded.payload').bind(m.id,WORKSPACE,m.name.toLocaleLowerCase('pt-BR'),m.email.toLowerCase(),m.portalEnabled?1:0,j(m)));
  const loanHeader=(l:Loan)=>{const {items,events,...header}=l;return header};
  diff(before.state.loans.map(loanHeader),next.loans.map(loanHeader),l=>this.db.prepare('INSERT INTO loans (id,workspace_id,merchant_id,due,payload) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET due=excluded.due,payload=excluded.payload').bind(l.id,WORKSPACE,l.merchantId,l.due,j(l)));
  // New loan rows must exist even when all header fields happen to be equal.
  const flatten=(s:State)=>s.loans.flatMap(l=>l.items.map(i=>({...i,id:`${l.id}:${i.productId}`,loanId:l.id})));
  diff(flatten(before.state),flatten(next),row=>{const {id,loanId,...i}=row;return this.db.prepare('INSERT INTO loan_items (id,loan_id,product_id,quantity,returned,sold,value,payload) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET returned=excluded.returned,sold=excluded.sold,payload=excluded.payload').bind(id,loanId,i.productId,i.quantity,i.returned,i.sold,i.unitValue,j(i))});
  const oldEventIds=new Set(before.state.loans.flatMap(l=>l.events).map(e=>e.id));for(const l of next.loans)for(const e of l.events)if(!oldEventIds.has(e.id))statements.push(this.db.prepare('INSERT INTO loan_events (id,loan_id,at,payload) VALUES (?,?,?,?)').bind(e.id,l.id,e.at,j(e)));
  diff(before.state.receivables,next.receivables,r=>this.db.prepare('INSERT INTO receivables (id,workspace_id,loan_id,merchant_id,amount,paid_amount,payload) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET paid_amount=excluded.paid_amount,payload=excluded.payload').bind(r.id,WORKSPACE,r.loanId,r.merchantId,r.amount,r.paidAmount??(r.paid?r.amount:0),j(r)));
  const oldPayments=new Set((before.state.payments||[]).map(p=>p.id));for(const p of next.payments||[])if(!oldPayments.has(p.id))statements.push(this.db.prepare('INSERT INTO payments (id,workspace_id,receivable_id,amount,payload) VALUES (?,?,?,?,?)').bind(p.id,WORKSPACE,p.receivableId,p.amount,j(p)));
  diff(before.state.notices,next.notices,n=>this.db.prepare('INSERT INTO notices (id,workspace_id,loan_id,merchant_id,audience,at,payload) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(n.id,WORKSPACE,n.loanId,n.merchantId,n.audience,n.at,j(n)));
  const oldNoticeIds=new Set(before.state.notices.map(n=>n.id));for(const n of next.notices)if(!oldNoticeIds.has(n.id))statements.push(outboxInsert(this.db,next,n));
  const oldMovements=new Set(before.state.movements.map(m=>m.id));for(const m of next.movements)if(!oldMovements.has(m.id))statements.push(this.db.prepare('INSERT INTO movements (id,workspace_id,at,payload) VALUES (?,?,?,?)').bind(m.id,WORKSPACE,m.at,j(m)));
  try{await this.db.batch(statements)}catch(error){const duplicate=await lookup();if(duplicate?.fingerprint===digest)return {...await this.read(actor),result:JSON.parse(duplicate.result)};const current=await this.db.prepare('SELECT revision FROM workspaces WHERE id=?').bind(WORKSPACE).first<{revision:number}>();if(current?.revision!==revision)throw new AppError('Outra operação foi registrada ao mesmo tempo. Os saldos foram protegidos; revise e confirme novamente.',409);throw error}
  return {...await this.read(actor),result:output.result};
 }
}
export function portalSnapshot(snapshot:Snapshot){
 const {state,actor,revision}=snapshot;if(actor.role!=='merchant'||!actor.merchantId)throw new AppError('Acesso exclusivo do lojista.',403);
 const merchant=state.merchants.find(m=>m.id===actor.merchantId);if(!merchant)throw new AppError('Lojista não encontrado.',404);
 const loans=state.loans.filter(l=>l.merchantId===merchant.id).map(l=>({...l,events:l.events.map(({actorId,...e})=>e)}));
 const receivables=state.receivables.filter(r=>r.merchantId===merchant.id);const receivableIds=new Set(receivables.map(r=>r.id));
 const {before,due,late,hour,...assistance}=state.settings||defaultSettings;
 return {revision,actor:{name:actor.name,email:actor.email},merchant:{id:merchant.id,name:merchant.name,contact:merchant.contact},assistance,loans,receivables,payments:state.payments?.filter(p=>receivableIds.has(p.receivableId))||[],notices:state.notices.filter(n=>n.merchantId===merchant.id&&n.audience==='Lojista')};
}
