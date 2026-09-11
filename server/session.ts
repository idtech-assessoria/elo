import { AppError } from './commands';
import type { SqlDatabase } from './database';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Call only with the exact token already accepted by Supabase Auth getUser. */
export function verifiedSessionId(accessToken: string, verifiedUserId: string, now = Date.now()): string {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
    if (claims.sub !== verifiedUserId || claims.role !== 'authenticated' || typeof claims.exp !== 'number' || claims.exp * 1000 <= now || typeof claims.session_id !== 'string' || !uuid.test(claims.session_id) || !uuid.test(verifiedUserId)) throw new Error('Invalid session');
    return claims.session_id;
  } catch { throw new AppError('Sua sessão expirou. Entre novamente.', 401); }
}

export async function assertActiveSession(db: SqlDatabase, userId: string, sessionId: string): Promise<void> {
  if (!uuid.test(userId) || !uuid.test(sessionId)) throw new AppError('Sessão inválida.', 401);
  const session = await db.prepare('SELECT elo_private.session_active(?::uuid,?::uuid) AS active').bind(sessionId, userId).first<{ active: boolean }>();
  if (session?.active !== true) throw new AppError('Sua sessão foi encerrada. Entre novamente.', 401);
}
