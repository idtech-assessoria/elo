import {env} from 'cloudflare:workers';
import {context,errorResponse,json} from '../../../../server/context';
import {Messaging} from '../../../../server/outbox';
export const dynamic='force-dynamic';
export async function GET(){try{const {repository,actor}=await context();return json(await new Messaging(repository.db,env.MESSAGING_ENCRYPTION_KEY).gmailCode(actor))}catch(e){return errorResponse(e)}}
