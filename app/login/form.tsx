'use client';
import { useState, type FormEvent } from 'react';

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, next }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível solicitar o acesso.');
      setSent(true); setMessage('Se este e-mail estiver autorizado, você receberá um link para entrar. Confira também a pasta de spam e abra o link neste navegador.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tente novamente em instantes.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="elo-login-form">
    <label htmlFor="email">Seu e-mail</label>
    <input id="email" name="email" type="email" autoComplete="email" required maxLength={150} value={email} onChange={event => { setEmail(event.target.value); setSent(false); }} placeholder="voce@exemplo.com" disabled={busy}/>
    <button className="btn primary" type="submit" disabled={busy || sent}>{busy ? 'Solicitando acesso…' : sent ? 'Confira seu e-mail' : 'Receber link de acesso'}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
