import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {createContext,runInContext} from 'node:vm';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {D1} from './sqlite-d1';
import {Repository} from '../server/repository';
import {Messaging} from '../server/outbox';
import {gmailScript} from '../server/gmail-script';
import {gmailRequest,defaultGmail} from '../server/gmail-bridge';
import {dayOffset} from '../app/domain';
const testSecret='c'.repeat(64);const endpoint='https://script.google.com/macros/s/'+('testdeployment_'.repeat(4))+'/exec';
const properties=new Map<string,string>();const sent:any[]=[];let user=defaultGmail;let quota=100;let busy=false;let crash=false;let dropResponse=false;let redirects=false;let malformed=false;let tamper=false;let lastRequest:any;
const context=createContext({
 ContentService:{MimeType:{JSON:'json'},createTextOutput(text:string){return {text,setMimeType(){return this}}}},
 Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeHmacSha256Signature:(s:string,key:string)=>Array.from(createHmac('sha256',key).update(s).digest()),computeDigest:(_:string,s:string)=>Array.from(createHash('sha256').update(s).digest())},
 Session:{getEffectiveUser:()=>({getEmail:()=>user})},LockService:{getScriptLock:()=>({tryLock:()=>!busy,releaseLock(){}})},
 PropertiesService:{getScriptProperties:()=>({getProperty:(k:string)=>properties.get(k)||null,setProperty:(k:string,v:string)=>properties.set(k,v),deleteProperty:(k:string)=>properties.delete(k),getProperties:()=>Object.fromEntries(properties)})},
 MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:(v:unknown)=>{sent.push(v);quota--;if(crash)throw Error('interrupted after send')}}
});
function loadScript(code:string){runInContext(code,context)}
function respond(body:string){return context.doPost({postData:{contents:body}}).text as string}
let redirectedResult='';
const transport=(async(url:RequestInfo|URL,options?:RequestInit)=>{
 if(options?.method==='GET'){assert.equal(new URL(String(url)).hostname,'script.googleusercontent.com');assert.equal(options.redirect,'error');return new Response(redirectedResult)}
 assert.equal(String(url),endpoint);lastRequest=JSON.parse(String(options?.body));const result=respond(String(options?.body));if(dropResponse)throw Error('connection interrupted');
 if(malformed)return new Response('<html>Google login</html>');if(tamper){const data=JSON.parse(result);data.payload=JSON.stringify({...JSON.parse(data.payload),sender:'wrong@gmail.com'});return Response.json(data)}
 if(redirects){redirectedResult=result;return new Response(null,{status:302,headers:{Location:'https://script.googleusercontent.com/macros/echo?token=test'}})}return new Response(result);
}) as typeof fetch;
loadScript(gmailScript(defaultGmail,testSecret));
const health=await gmailRequest(endpoint,testSecret,{action:'health',sender:defaultGmail},transport);assert.equal(health.ok,true);assert.equal(health.sender,defaultGmail);assert.equal(health.quotaRemaining,100);assert.equal(sent.length,0);
redirects=true;assert.equal((await gmailRequest(endpoint,testSecret,{action:'health',sender:defaultGmail},transport)).ok,true);redirects=false;
await assert.rejects(gmailRequest('https://example.com/exec',testSecret,{action:'health'},transport),/configuração/);
const badRedirect=(async()=>new Response(null,{status:302,headers:{Location:'https://attacker.example/steal'}})) as typeof fetch;await assert.rejects(gmailRequest(endpoint,testSecret,{action:'health'},badRedirect),/Publique/);
tamper=true;await assert.rejects(gmailRequest(endpoint,testSecret,{action:'health',sender:defaultGmail},transport),/assinatura/);tamper=false;
malformed=true;await assert.rejects(gmailRequest(endpoint,testSecret,{action:'health',sender:defaultGmail},transport),/não confirmou/);malformed=false;
const body={from:defaultGmail,to:['parceiro@example.com'],subject:'Peças — teste',text:'1 × Tela · R$ 100,00',html:'<p>1 × Tela · R$ 100,00</p>'};
let result=await gmailRequest(endpoint,testSecret,{action:'send',sender:defaultGmail,id:'email-first',email:body},transport);assert.equal(result.status,'sent');assert.equal(sent.length,1);
result=await gmailRequest(endpoint,testSecret,{action:'send',sender:defaultGmail,id:'email-first',email:body},transport);assert.equal(result.status,'sent');assert.equal(sent.length,1);
assert.equal((await gmailRequest(endpoint,testSecret,{action:'send',sender:defaultGmail,id:'email-first',email:{...body,text:'Mudança'}},transport)).code,'conflict');assert.equal(sent.length,1);
const invalidSignature={...lastRequest,signature:'0'.repeat(64)};assert.equal(respond(JSON.stringify(invalidSignature)),'Solicitação não autorizada.');assert.equal(sent.length,1);
const oldEnvelope={...lastRequest,timestamp:Date.now()-600000};oldEnvelope.signature=createHmac('sha256',testSecret).update(oldEnvelope.timestamp+'\n'+oldEnvelope.nonce+'\n'+oldEnvelope.payload).digest('hex');assert.equal(respond(JSON.stringify(oldEnvelope)),'Solicitação não autorizada.');
user='other@gmail.com';assert.equal((await gmailRequest(endpoint,testSecret,{action:'send',sender:defaultGmail,id:'email-other',email:body},transport)).code,'wrong_account');user=defaultGmail;
busy=true;assert.equal((await gmailRequest(endpoint,testSecret,{action:'send',sender:defaultGmail,id:'email-busy',email:body},transport)).code,'busy');busy=false;
quota=0;assert.equal((await gmailRequest(endpoint,testSecret,{action:'send',sender:defaultGmail,id:'email-quota',email:body},transport)).code,'quota');assert.equal(sent.length,1);quota=100;
crash=true;assert.equal((await gmailRequest(endpoint,testSecret,{action:'send',sender:defaultGmail,id:'email-crash',email:body},transport)).code,'uncertain');crash=false;assert.equal(sent.length,2);assert.equal((await gmailRequest(endpoint,testSecret,{action:'send',sender:defaultGmail,id:'email-crash',email:body},transport)).code,'uncertain');assert.equal(sent.length,2);
// Full repository, setup and outbox round trip through the exact generated Google code.
const folder=mkdtempSync(join(tmpdir(),'elo-gmail-check-'));const db=new D1(join(folder,'test.sqlite'));for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
const binding=db as unknown as D1Database;const repo=new Repository(binding);const actor=await repo.actor({userId:'owner-test',email:'lopesleticia297@gmail.com',displayName:'Dona'});let state=await repo.read(actor);const messaging=new Messaging(binding,'a'.repeat(64),transport);
const outsider={id:'foreign',name:'Lojista',email:'other@gmail.com',role:'merchant' as const,merchantId:'m'};await assert.rejects(messaging.prepareGmail(outsider),/administradora/);await assert.rejects(messaging.gmailCode(outsider),/administradora/);
assert.equal((await messaging.snapshot(actor)).gmailSetup!.sender,defaultGmail);await messaging.prepareGmail(actor);const setup=await messaging.gmailCode(actor);assert.equal(setup.sender,defaultGmail);assert.ok(setup.script.includes(defaultGmail));await messaging.prepareGmail(actor);assert.equal((await messaging.gmailCode(actor)).script,setup.script);assert.equal((await messaging.snapshot(actor)).connection.configured,false);
// Constants need a new context for a second script instance.
const setupContext=createContext({...context});runInContext(setup.script,setupContext);context.doPost=setupContext.doPost;
user='different@gmail.com';await assert.rejects(messaging.configureGmail(actor,{endpoint,revision:0}),/outra conta/);assert.equal((await messaging.snapshot(actor)).connection.enabled,false);user=defaultGmail;
await messaging.configureGmail(actor,{endpoint,revision:0});let info=await messaging.snapshot(actor);assert.equal(info.connection.provider,'gmail');assert.equal(info.connection.sender,defaultGmail);assert.equal(info.connection.enabled,true);assert.equal('encrypted_key' in info.connection,false);assert.equal('script' in info,false);
async function command(input:unknown){const result=await repo.execute(actor,crypto.randomUUID(),state.revision,input);state=result;return result}
const p=await command({kind:'piece.save',piece:{name:'Tela',sku:'G-01',category:'Telas',compatible:'Modelo',quality:'Nova',location:'Gaveta',available:10,minimum:1,cost:5000,value:9000}});const pieceId=String(p.result.id);
const m=await command({kind:'merchant.save',merchant:{name:'Loja',contact:'Parceiro',email:'parceiro@example.com',phone:'31999999999',city:'Betim',limit:500000,active:true,portalEnabled:true}});const merchantId=String(m.result.id);const loan={kind:'loan.create',merchantId,due:dayOffset(3),items:{[pieceId]:1},notes:'Conferida'};
await command(loan);const before=sent.length;dropResponse=true;await messaging.process();assert.equal(sent.length,before+2);dropResponse=false;await db.prepare("UPDATE email_outbox SET next_attempt_at=NULL WHERE status='queued'").run();await messaging.process();assert.equal(sent.length,before+2);info=await messaging.snapshot(actor);assert.ok(info.deliveries.every(d=>d.provider==='gmail'&&d.status==='sent'));assert.ok(info.deliveries.every(d=>d.status!=='delivered'));await assert.rejects(messaging.enqueue(actor,info.deliveries[0].id),/não pode/);await assert.rejects(messaging.check(actor,info.deliveries[0].id),/não disponibiliza/);
await command(loan);quota=0;await messaging.process();info=await messaging.snapshot(actor);assert.equal(info.connection.quotaRemaining,0);assert.equal(info.deliveries.filter(d=>d.status==='queued').length,2);assert.equal(sent.length,before+2);quota=100;
await db.prepare("UPDATE email_outbox SET next_attempt_at=NULL WHERE status='queued'").run();await messaging.process();assert.equal(sent.length,before+4);assert.ok((await messaging.snapshot(actor)).deliveries.every(d=>d.status==='sent'));
await command(loan);crash=true;await messaging.process();crash=false;assert.equal((await messaging.snapshot(actor)).deliveries.filter(d=>d.status==='uncertain').length,2);const afterCrash=sent.length;await messaging.process();assert.equal(sent.length,afterCrash);
await command(loan);quota=0;await messaging.process();await messaging.configureGmail(actor,{endpoint,revision:1});quota=100;await db.prepare("UPDATE email_outbox SET next_attempt_at=NULL WHERE status='queued'").run();const beforeRotation=sent.length;await messaging.process();assert.equal(sent.length,beforeRotation);assert.equal((await messaging.snapshot(actor)).deliveries.filter(d=>d.status==='uncertain').length,4);
db.sqlite.close();rmSync(folder,{recursive:true,force:true});console.log('OK: generated Google script signed round trips, response authentication, redirect allowlist, wrong account rejection, no public sending, stale replay rejection, content conflict, quota pause, crash checkpoint, idempotent lost-response recovery, encrypted resumable setup, owner authorization and sent-versus-delivered distinction. MailApp is mocked; no real email sent.');
