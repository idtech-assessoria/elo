import { context,errorResponse,json } from '../../../server/context';
import { portalSnapshot } from '../../../server/repository';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{const {repository,actor}=await context();return json(portalSnapshot(await repository.read(actor)))}catch(e){return errorResponse(e)}}
export function POST(){const response=json({error:'O portal do lojista é somente para consulta. Fale com a assistência para qualquer alteração.'},405);response.headers.set('Allow','GET');return response;}
