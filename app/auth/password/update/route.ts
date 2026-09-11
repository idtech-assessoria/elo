import { supabaseServer } from '../../../../server/supabase';
import { getDatabase } from '../../../../server/postgres';
import { updateAccountPassword } from '../../../../server/password';
import { json, errorResponse, requestBody } from '../../../../server/http';
import { AppError } from '../../../../server/commands';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const input = await requestBody(request);
    await updateAccountPassword(await supabaseServer(), getDatabase(), input);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error instanceof AppError ? error : new AppError('Não foi possível salvar sua senha agora. Tente novamente em instantes.', 503));
  }
}
