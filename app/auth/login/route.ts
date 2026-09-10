import { z } from 'zod';
import { cookies } from 'next/headers';
import { supabaseServer } from '../../../server/supabase';
import { appOrigin, bootstrapOwner } from '../../../server/config';
import { getDatabase } from '../../../server/postgres';
import { errorResponse, json, requestBody } from '../../../server/context';
import { AppError } from '../../../server/commands';
import { safeReturnPath } from '../../../lib/auth-path';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const input = z.object({ email: z.string().trim().email().max(150), next: z.string().optional() }).safeParse(await requestBody(request));
    if (!input.success) throw new AppError('Informe um e-mail válido.');
    const address = input.data.email.toLowerCase();
    const owner = bootstrapOwner();
    const isOwner = !!owner.email && address === owner.email;
    const merchant = isOwner ? null : await getDatabase().prepare('SELECT id FROM merchants WHERE workspace_id=? AND email=? AND portal_enabled=1').bind('primary', address).first();
    // Keep the response identical for unknown addresses; do not send links to them.
    if (!isOwner && !merchant) return json({ ok: true });
    const next = safeReturnPath(input.data.next ?? (isOwner ? '/' : '/portal'));
    const cookieStore = await cookies();
    cookieStore.set('elo-return', next, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true, emailRedirectTo: appOrigin() + '/auth/callback' } });
    if (error) throw new AppError(error.status === 429 ? 'Aguarde um pouco antes de solicitar outro link.' : 'O serviço de acesso não está disponível. Tente novamente em instantes.', error.status === 429 ? 429 : 503);
    return json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
