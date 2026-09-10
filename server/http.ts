import {appOrigin} from './config';
import {AppError} from './commands';
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
export function errorResponse(error:unknown){if(error instanceof AppError)return json({error:error.message},error.status);console.error('Elo operation failed',error);return json({error:'Não foi possível concluir a operação. Seus dados do formulário foram mantidos; tente novamente.'},503)}
export async function requestBody(request:Request){
 const origin=request.headers.get('origin');if(origin!==appOrigin())throw new AppError('Origem da solicitação não autorizada.',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('Formato de solicitação inválido.',415);
 const limit=128000;if(Number(request.headers.get('content-length'))>limit)throw new AppError('A solicitação é muito grande.',413);
 if(!request.body)throw new AppError('Dados da solicitação ausentes.');const reader=request.body.getReader();const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new AppError('A solicitação é muito grande.',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new AppError('Dados da solicitação inválidos.')}
}
