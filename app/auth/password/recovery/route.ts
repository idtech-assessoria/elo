import { z } from 'zod';
import { supabaseServer } from '../../../../server/supabase';
import { json, errorResponse, requestBody } from '../../../../server/http';
import { AppError } from '../../../../server/commands';
import { verifiedSessionId } from '../../../../server/session';

export const runtime = 'nodejs';
const inputSchema = z.object({ email: z.string().trim().email().max(150), code: z.string().regex(/^\d{6,10}$/) }).strict();
export async function POST(request: Request) {
  try {
    const input = inputSchema.safeParse(await requestBody(request));
    if (!input.success) throw new AppError('Informe seu e-mail e o código de ativação.');
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.verifyOtp({ email: input.data.email.toLowerCase(), token: input.data.code, type: 'recovery' });
    if (error) {
      if (error.status === 429) throw new AppError('Muitas tentativas. Aguarde um pouco antes de tentar novamente.', 429);
      if (!error.status || error.status >= 500) throw new AppError('Não foi possível validar o código agora. Tente novamente.', 503);
      throw new AppError('Código inválido, expirado ou já utilizado.', 401);
    }
    if (!data.session || !data.user?.email_confirmed_at || data.user.is_anonymous || data.user.email?.toLowerCase() !== input.data.email.toLowerCase()) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new AppError('Não foi possível confirmar sua conta.', 401);
    }
    verifiedSessionId(data.session.access_token, data.user.id);
    return json({ ok: true, next: '/account/password' });
  } catch (error) {
    return errorResponse(error instanceof AppError ? error : new AppError('Não foi possível validar o código agora. Tente novamente.', 503));
  }
}
