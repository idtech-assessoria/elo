import type { SupabaseClient } from '@supabase/supabase-js';
import type { SqlDatabase } from './database';
import { passwordChangeInput } from '../lib/password-input';
import { verifyIdentity } from './identity';
import { AppError } from './commands';

export async function updateAccountPassword(supabase: Pick<SupabaseClient, 'auth'>, db: SqlDatabase, raw: unknown) {
  const input = passwordChangeInput.safeParse(raw);
  if (!input.success) throw new AppError(input.error.issues[0]?.message || 'Confira a nova senha.');
  // This exact session must be confirmed and not revoked. Never accept a target id/email.
  await verifyIdentity(supabase, db);
  const { error } = await supabase.auth.updateUser({
    password: input.data.password,
    ...(input.data.currentPassword ? { current_password: input.data.currentPassword } : {}),
  });
  if (error) {
    if (error.status === 429) throw new AppError('Muitas tentativas. Aguarde um pouco antes de tentar novamente.', 429);
    if (error.code === 'reauthentication_needed' || error.code === 'reauthentication_not_valid') throw new AppError('Entre novamente para confirmar a alteração da senha.', 401);
    if (error.code === 'same_password') throw new AppError('Escolha uma senha diferente da atual.');
    if (error.code === 'weak_password') throw new AppError('Escolha uma senha mais forte, com letras, números e símbolos.');
    if (error.status && error.status < 500) throw new AppError('Não foi possível alterar a senha. Confira a senha atual, se informada.');
    throw new AppError('Não foi possível salvar sua senha agora. Tente novamente em instantes.', 503);
  }
}
