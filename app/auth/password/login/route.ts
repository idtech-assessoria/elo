import { passwordLoginInput } from '../../../../lib/password-input';
import { safeReturnPath } from '../../../../lib/auth-path';
import { bootstrapOwner } from '../../../../server/config';
import { supabaseServer } from '../../../../server/supabase';
import { json, errorResponse, requestBody } from '../../../../server/http';
import { AppError } from '../../../../server/commands';
import { verifiedSessionId } from '../../../../server/session';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const input = passwordLoginInput.safeParse(await requestBody(request));
    if (!input.success) throw new AppError('Informe seu e-mail e sua senha.');
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.data.email.toLowerCase(), password: input.data.password,
    });
    if (error) {
      if (error.status === 429) throw new AppError('Muitas tentativas. Aguarde um pouco antes de tentar novamente.', 429);
      if (!error.status || error.status >= 500) throw new AppError('Não foi possível entrar agora. Tente novamente em instantes.', 503);
      throw new AppError('E-mail ou senha inválidos. Confira os dados da sua conta do Elo.', 401);
    }
    // Values from the Auth password exchange, never user-editable metadata.
    if (!data.session || !data.user?.email_confirmed_at || !data.user.email || data.user.is_anonymous) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new AppError('Confirme o e-mail da sua conta antes de entrar.', 401);
    }
    verifiedSessionId(data.session.access_token, data.user.id);
    const owner = bootstrapOwner();
    const isOwner = data.user.id === owner.id && data.user.email.toLowerCase() === owner.email;
    const requested = safeReturnPath(input.data.next);
    // Landing-page choice grants no role. Pages/APIs still verify the session
    // and enforce owner/merchant authorization against the database.
    const next = requested === '/account/password' ? requested : isOwner ? '/' : '/portal';
    return json({ ok: true, next });
  } catch (error) {
    // Never log credential request bodies or provider response objects.
    return errorResponse(error instanceof AppError ? error : new AppError('Não foi possível entrar agora. Tente novamente em instantes.', 503));
  }
}
