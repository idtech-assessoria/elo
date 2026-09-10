import type { SupabaseClient } from '@supabase/supabase-js';
import type { SqlDatabase } from './database';
import { assertActiveSession, verifiedSessionId } from './session';
import { AppError } from './commands';

export async function verifyIdentity(supabase: Pick<SupabaseClient, 'auth'>, db: SqlDatabase) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) throw new AppError('Entre na sua conta para continuar.', 401);
  // The cookie supplies a token, never the identity used for authorization.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at || data.user.is_anonymous) throw new AppError('Entre novamente com seu e-mail confirmado.', 401);
  const sessionId = verifiedSessionId(token, data.user.id);
  await assertActiveSession(db, data.user.id, sessionId);
  return { userId: data.user.id, email: data.user.email.toLowerCase(), displayName: data.user.email, sessionId };
}
