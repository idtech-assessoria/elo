import Link from 'next/link';
import { safeReturnPath } from '../../lib/auth-path';
import LoginForm from './form';

export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <main className="elo-login"><section className="elo-login-card">
    <Link className="elo-login-brand" href="/">elo<span>PEÇAS &amp; EMPRÉSTIMOS</span></Link>
    <h1>Seu próximo passo começa aqui.</h1>
    <p>Acesse sua assistência ou o portal da sua loja com um link enviado ao seu e-mail.</p>
    {params.error && <p role="alert" className="elo-login-error">O link expirou ou não pôde ser validado. Solicite outro e abra-o neste mesmo navegador.</p>}
    <LoginForm next={safeReturnPath(params.next)}/>
    <small>Use o e-mail cadastrado pela assistência. Não é necessário criar uma senha.</small>
  </section></main>;
}
