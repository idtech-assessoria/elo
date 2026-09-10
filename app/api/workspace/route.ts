import {env} from 'cloudflare:workers';
import {Messaging} from '../../../server/outbox';
import { z } from 'zod';
import { context,errorResponse,json,requestBody } from '../../../server/context';
import { AppError } from '../../../server/commands';
export const dynamic='force-dynamic';
export async function GET(){try{const {repository,actor}=await context();if(actor.role!=='owner')throw new AppError('Use o portal do lojista.',403);return json(await repository.read(actor))}catch(e){return errorResponse(e)}}
export async function POST(request:Request){try{const input=await requestBody(request);const parsed=z.object({id:z.string().uuid(),revision:z.number().int().min(0),command:z.unknown()}).safeParse(input);if(!parsed.success)throw new AppError('Solicitação inválida. Atualize a página e tente novamente.');const {repository,actor}=await context();if(actor.role!=='owner')throw new AppError('Seu acesso não permite administrar a assistência.',403);const result=await repository.execute(actor,parsed.data.id,parsed.data.revision,parsed.data.command);try{await new Messaging(repository.db,env.MESSAGING_ENCRYPTION_KEY).process()}catch{console.error('Email queue processing interrupted; operation preserved')}return json(result)}catch(e){return errorResponse(e)}}
