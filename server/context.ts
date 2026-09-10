import {getDatabase} from './postgres';
import { authenticatedUser } from './auth';
import { Repository } from './repository';
export async function context(){const user=await authenticatedUser();const repository=new Repository(getDatabase());const actor=await repository.actor(user);return {repository,actor}}
export {json,errorResponse,requestBody} from './http';
