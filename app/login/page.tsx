import Link from 'next/link';
import { safeReturnPath } from '../../lib/auth-path';
import LoginForm from './form';

export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <main className="elo-login"><section className="elo-login-card">
    <Link className="elo-login-brand" href="/">elo<span>PEÇAS &amp; EMPRÉSTIMOS</span></Link>
    <h1>Entrar no Elo</h1>
    <p>Informe seu e-mail para receber um novo link e acessar sua assistência ou o portal da sua loja.</p>
    {params.error === 'logout'
      ? <p role="alert" className="elo-login-error">Não foi possível confirmar a saída no servidor. Você pode entrar novamente pelo formulário abaixo.</p>
      : params.error && <p role="alert" className="elo-login-error">O link expirou ou já foi usado. Solicite um novo link abaixo e abra-o neste mesmo navegador.</p>}
    {!params.error && params.signedout === '1' && <p role="status">Você saiu da sua conta. Para voltar, entre novamente abaixo.</p>}
    <LoginForm next={safeReturnPath(params.next)}/>
    <small>O login é por e-mail, sem senha. Sempre que sair, volte a esta página e solicite um novo link. Cada link pode ser usado uma única vez.</small>
  </section></main>;
}
