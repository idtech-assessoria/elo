import 'server-only';
import { redirect } from 'next/navigation';
import { safeReturnPath } from '../lib/auth-path';
import { supabaseServer } from './supabase';
import { getDatabase } from './postgres';
import { verifyIdentity } from './identity';
import { AppError } from './commands';

export async function authenticatedUser(readOnly = false) {
  return verifyIdentity(await supabaseServer(readOnly), getDatabase());
}

export async function requireUser(next: string) {
  try { return await authenticatedUser(true); }
  catch (error) {
    if (error instanceof AppError && error.status === 401) redirect('/login?next=' + encodeURIComponent(safeReturnPath(next)));
    throw error;
  }
}
