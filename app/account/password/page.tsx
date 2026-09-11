import Link from 'next/link';
import { requireUser } from '../../../server/auth';
import PasswordForm from './form';

export const dynamic = 'force-dynamic';
export default async function PasswordPage() {
  const user = await requireUser('/account/password');
  return <main className="elo-login"><section className="elo-login-card">
    <Link className="elo-login-brand" href="/">elo<span>PEÇAS &amp; EMPRÉSTIMOS</span></Link>
    <h1>Sua senha de acesso</h1>
    <p>Defina uma senha para entrar no Elo com <strong>{user.email}</strong>.</p>
    <PasswordForm email={user.email}/>
    <Link className="text-button elo-back-link" href="/">Voltar ao Elo</Link>
  </section></main>;
}
