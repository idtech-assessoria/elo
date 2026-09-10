import {z} from 'zod';
import {AppError} from './commands';
export const defaultGmail='idtech.assessoria@gmail.com';
export const gmailEndpoint=z.string().trim().regex(/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/, 'Informe a URL /exec da implantação do Google.');
const bytes=(hex:string)=>new Uint8Array(hex.match(/.{2}/g)!.map(v=>parseInt(v,16)));
const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value)).map(x=>x.toString(16).padStart(2,'0')).join('');
export type GmailReply={ok:boolean;code?:string;protocol?:string;sender?:string;quotaRemaining?:number;status?:string;id?:string};
export async function gmailRequest(endpoint:string,secret:string,input:unknown,transport:typeof fetch=fetch):Promise<GmailReply>{
 if(!gmailEndpoint.safeParse(endpoint).success||!/^[a-f0-9]{64}$/.test(secret))throw new AppError('Confira a configuração do Gmail antes de continuar.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 const timestamp=Date.now();const nonce=hex(crypto.getRandomValues(new Uint8Array(16)).buffer);const payload=JSON.stringify(input);const signature=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'\n'+nonce+'\n'+payload)));
 const signal=AbortSignal.timeout(15000);let response=await transport(endpoint,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify({timestamp,nonce,payload,signature}),signal});
 if([301,302,303].includes(response.status)){
  const target=response.headers.get('location');let url:URL;try{url=new URL(target||'')}catch{throw new AppError('A conexão Google retornou um endereço inválido.')}
  if(url.protocol!=='https:'||url.hostname!=='script.googleusercontent.com'||url.username||url.password||url.port)throw new AppError('Publique o script para executar como você, com acesso de qualquer pessoa. O código valida a assinatura de cada pedido.');
  response=await transport(url.href,{method:'GET',redirect:'error',signal});
 }
 if(!response.ok)throw new AppError('O Google não respondeu à conexão. Confira a implantação e tente novamente.');
 const length=Number(response.headers.get('content-length'));if(length>10000)throw new AppError('O Google retornou uma página de acesso. Confira a implantação do script.');
 const raw=await response.text();if(raw.length>10000)throw new AppError('A resposta do Google não corresponde à conexão Elo.');
 let envelope:{payload:string;signature:string};try{envelope=JSON.parse(raw)}catch{throw new AppError('O Google não confirmou a conexão. Confira o código, a URL /exec e as permissões da implantação.')}
 if(typeof envelope.payload!=='string'||typeof envelope.signature!=='string'||!/^[a-f0-9]{64}$/.test(envelope.signature)||!await crypto.subtle.verify('HMAC',key,bytes(envelope.signature),new TextEncoder().encode(nonce+'\n'+envelope.payload)))throw new AppError('A assinatura da conexão não confere. Copie novamente o código do Elo para o seu projeto Google e atualize a implantação.');
 const result=z.object({ok:z.boolean(),code:z.string().optional(),protocol:z.string().optional(),sender:z.string().optional(),quotaRemaining:z.number().int().min(0).optional(),status:z.string().optional(),id:z.string().optional()}).safeParse(JSON.parse(envelope.payload));if(!result.success)throw new AppError('O Google retornou uma resposta inesperada.');return result.data;
}
export function gmailError(code?:string){return ({wrong_account:'O script foi autorizado por outra conta. Implante usando o Gmail escolhido na conexão.',quota:'O limite de destinatários do Google foi atingido. A fila aguardará a renovação da cota.',busy:'Outra mensagem está sendo enviada. A fila aguardará antes de tentar novamente.',conflict:'A identificação já está associada a outro conteúdo. Confira o envio antes de criar um novo aviso.',uncertain:'O Google iniciou o envio, mas não confirmou a conclusão. Confira com o destinatário antes de gerar outro aviso.',invalid:'O Google recusou os dados da mensagem. Confira o contato e o tamanho do aviso.',unavailable:'A conexão Google está temporariamente indisponível. A mensagem foi preservada.'} as Record<string,string>)[code||'']||'Não foi possível confirmar a conexão Google.'}
