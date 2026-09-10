import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getDatabase } from '../server/postgres';
import * as schema from './schema';
export function getDb() { return drizzle(getDatabase().pool, { schema }); }
