import {z} from 'zod';
import {context,errorResponse,json,requestBody} from '../../../server/context';
import {AppError} from '../../../server/commands';
import {Messaging} from '../../../server/outbox';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{const {repository,actor}=await context();return json(await new Messaging(repository.db,process.env.MESSAGING_ENCRYPTION_KEY).snapshot(actor))}catch(e){return errorResponse(e)}}
export async function POST(request:Request){try{
 const v=z.object({kind:z.enum(['configure','gmail.prepare','gmail.connect','pause','process','send','cancel','recipient','whatsapp','test','check']),id:z.string().max(100).optional(),enabled:z.boolean().optional(),revision:z.number().int().min(0).optional(),sender:z.string().optional(),endpoint:z.string().max(500).optional(),apiKey:z.string().max(220).optional()}).safeParse(await requestBody(request));if(!v.success)throw new AppError('Solicitação de mensagem inválida.');
 const {repository,actor}=await context();if(actor.role!=='owner')throw new AppError('Somente a administradora pode gerenciar os envios.',403);const m=new Messaging(repository.db,process.env.MESSAGING_ENCRYPTION_KEY);const input=v.data;
 if(input.kind==='configure')await m.configure(actor,input);
 else if(input.kind==='gmail.prepare')await m.prepareGmail(actor,input.sender);
 else if(input.kind==='gmail.connect')await m.configureGmail(actor,input);
 else if(input.kind==='pause'){if(input.enabled===undefined||input.revision===undefined)throw new AppError('Preferência inválida.');await m.pause(actor,input.enabled,input.revision)}
 else if(input.kind==='process'){await m.process();await m.refreshStatuses(actor)}
 else{if(!input.id)throw new AppError('Selecione uma mensagem.');if(input.kind==='send'){await m.enqueue(actor,input.id);await m.process()}if(input.kind==='cancel')await m.cancel(actor,input.id);if(input.kind==='recipient')await m.refreshRecipient(actor,input.id,(await repository.read(actor)).state);if(input.kind==='whatsapp')await m.prepareWhatsApp(actor,input.id);if(input.kind==='test'){await m.test(actor,input.id);await m.process()}if(input.kind==='check')await m.check(actor,input.id)}
 return json(await m.snapshot(actor));
 }catch(e){return errorResponse(e)}}
