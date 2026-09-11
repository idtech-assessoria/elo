'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivationForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/auth/password/recovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível validar o código.');
      setCode('');
      router.replace('/account/password');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Tente novamente em instantes.');
      setBusy(false);
    }
  }
  return <form className="elo-login-form" action="/auth/password/recovery" method="post" onSubmit={submit}>
    <label htmlFor="activation-email">Seu e-mail</label>
    <input id="activation-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={150} value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/>
    <label htmlFor="activation-code">Código de ativação</label>
    <input id="activation-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required minLength={6} maxLength={10} value={code} onChange={event => setCode(event.target.value.replace(/\s/g, ''))} disabled={busy}/>
    <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Verificando…' : 'Continuar e escolher minha senha'}</button>
    {error && <p role="alert" className="elo-login-error">{error}</p>}
  </form>;
}
