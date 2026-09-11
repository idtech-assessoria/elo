'use client';
import { useState, type FormEvent } from 'react';
import { safeReturnPath } from '../../lib/auth-path';

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/auth/password/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
      setPassword('');
      window.location.assign(safeReturnPath(data.next));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Tente novamente em instantes.');
      setBusy(false);
    }
  }
  return <form onSubmit={submit} action="/auth/password/login" method="post" className="elo-login-form">
    <label htmlFor="email">Seu e-mail</label>
    <input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={150} value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@exemplo.com" disabled={busy}/>
    <label htmlFor="password">Sua senha</label>
    <div className="elo-password-field">
      <input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={1024} value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/>
      <button className="text-button" type="button" onClick={() => setVisible(value => !value)} aria-controls="password" aria-pressed={visible}>{visible ? 'Ocultar' : 'Mostrar'}</button>
    </div>
    <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    {error && <p role="alert" className="elo-login-error">{error}</p>}
  </form>;
}
