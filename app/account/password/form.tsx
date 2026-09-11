'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { passwordChangeInput } from '../../../lib/password-input';

export default function PasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const input = passwordChangeInput.safeParse({ password, confirmation, currentPassword });
    if (!input.success) { setError(input.error.issues[0].message); return; }
    setBusy(true); setError(''); setExpired(false);
    try {
      const response = await fetch('/auth/password/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input.data) });
      const data = await response.json();
      if (!response.ok) { setExpired(response.status === 401); throw new Error(data.error || 'Não foi possível salvar a senha.'); }
      setPassword(''); setConfirmation(''); setCurrentPassword(''); setSaved(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Tente novamente em instantes.'); }
    finally { setBusy(false); }
  }
  if (saved) return <div className="elo-login-help" role="status"><p><strong>Senha salva.</strong> Nas próximas entradas, use seu e-mail e a senha que acabou de definir.</p><Link className="btn primary full-width" href="/">Abrir o Elo</Link></div>;
  return <form className="elo-login-form" action="/auth/password/update" method="post" onSubmit={submit}>
    <input type="email" name="username" autoComplete="username" value={email} readOnly hidden/>
    <label htmlFor="new-password">Nova senha</label>
    <input id="new-password" name="new-password" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={10} maxLength={64} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} aria-describedby="password-help"/>
    <p id="password-help">Use de 10 a 64 caracteres. Prefira uma combinação de palavras, números e símbolos.</p>
    <label htmlFor="confirm-password">Repita a nova senha</label>
    <input id="confirm-password" name="confirm-password" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={10} maxLength={64} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy}/>
    <button type="button" className="text-button" onClick={() => setVisible(value => !value)} aria-pressed={visible}>{visible ? 'Ocultar senhas' : 'Mostrar senhas'}</button>
    <details><summary>Já uso senha e quero alterá-la</summary><label htmlFor="current-password">Senha atual</label><input id="current-password" name="current-password" type="password" autoComplete="current-password" maxLength={1024} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={busy}/></details>
    <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar minha senha'}</button>
    {error && <p role="alert" className="elo-login-error">{error}</p>}
    {expired && <Link href="/login?next=%2Faccount%2Fpassword" prefetch={false}>Entrar novamente</Link>}
  </form>;
}
