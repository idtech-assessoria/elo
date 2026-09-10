import {env} from 'cloudflare:workers';
import {Messaging} from '../../../server/outbox';
import { z } from 'zod';
import { context,errorResponse,json,requestBody } from '../../../server/context';
import { AppError } from '../../../server/commands';
import { portalSnapshot } from '../../../server/repository';
export const dynamic='force-dynamic';
export async function GET(){try{const {repository,actor}=await context();return json(portalSnapshot(await repository.read(actor)))}catch(e){return errorResponse(e)}}
export async function POST(request:Request){try{const parsed=z.object({id:z.string().uuid(),revision:z.number().int().min(0),command:z.unknown()}).safeParse(await requestBody(request));if(!parsed.success)throw new AppError('Solicitação inválida.');const {repository,actor}=await context();if(actor.role!=='merchant')throw new AppError('Somente o lojista pode confirmar o recebimento pelo portal.',403);const result=await repository.execute(actor,parsed.data.id,parsed.data.revision,parsed.data.command);try{await new Messaging(repository.db,env.MESSAGING_ENCRYPTION_KEY).process()}catch{console.error('Email queue processing interrupted; operation preserved')}return json({...portalSnapshot(result),result:result.result})}catch(e){return errorResponse(e)}}
