'use client';
import { useEffect, useState, type FormEvent } from 'react';

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cooldown > 0) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, next }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) setCooldown(60);
        throw new Error(data.error || 'Não foi possível solicitar o acesso.');
      }
      setSent(true); setCooldown(60); setMessage('Se este e-mail estiver autorizado, você receberá um novo link para entrar. Confira também a pasta de spam e abra a mensagem mais recente neste navegador.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tente novamente em instantes.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="elo-login-form">
    <label htmlFor="email">Seu e-mail</label>
    <input id="email" name="email" type="email" autoComplete="email" required maxLength={150} value={email} onChange={event => { setEmail(event.target.value); setSent(false); }} placeholder="voce@exemplo.com" disabled={busy}/>
    <button className="btn primary" type="submit" disabled={busy || cooldown > 0}>{busy ? 'Solicitando acesso…' : cooldown > 0 ? `Aguarde ${cooldown}s para reenviar` : sent ? 'Reenviar link de acesso' : 'Entrar com e-mail'}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
