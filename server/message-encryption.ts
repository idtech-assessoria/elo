import {AppError} from './commands';
const context=new TextEncoder().encode('elo:primary:resend:v1');
async function key(secret:string|undefined){if(!secret||!/^[a-f0-9]{64}$/i.test(secret))throw new AppError('A proteção das credenciais ainda não foi ativada. Fale com a administradora.',503);return crypto.subtle.importKey('raw',new Uint8Array(secret.match(/.{2}/g)!.map(x=>parseInt(x,16))),{name:'AES-GCM'},false,['encrypt','decrypt'])}
const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const decode=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export async function encryptApiKey(value:string,secret?:string){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context},await key(secret),new TextEncoder().encode(value));return encode(iv)+'.'+encode(new Uint8Array(encrypted))}
export async function decryptApiKey(value:string,secret?:string){try{const [iv,encrypted]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:context},await key(secret),decode(encrypted)))}catch{throw new AppError('Não foi possível abrir a credencial de envio. Conecte o e-mail novamente.',503)}}
