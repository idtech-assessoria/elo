import { context,errorResponse } from '../../../server/context';
import { AppError } from '../../../server/commands';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{const {repository,actor}=await context();if(actor.role!=='owner')throw new AppError('A exportação é exclusiva da gestão.',403);const snapshot=await repository.read(actor);return new Response(JSON.stringify({format:'elo-export-v1',exportedAt:new Date().toISOString(),revision:snapshot.revision,state:snapshot.state},null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="elo-registros.json"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}catch(e){return errorResponse(e)}}
