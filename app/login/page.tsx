import Link from 'next/link';
import { safeReturnPath } from '../../lib/auth-path';
import LoginForm from './form';
import EmailLinkForm from './link-form';

export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <main className="elo-login"><section className="elo-login-card">
    <Link className="elo-login-brand" href="/">elo<span>PEÇAS &amp; EMPRÉSTIMOS</span></Link>
    <h1>Entrar no Elo</h1>
    <p>Entre com seu e-mail e senha para acessar sua assistência ou o portal da sua loja.</p>
    {params.error === 'logout'
      ? <p role="alert" className="elo-login-error">Não foi possível confirmar a saída no servidor. Você pode entrar novamente pelo formulário abaixo.</p>
      : params.error && <p role="alert" className="elo-login-error">O link expirou ou já foi usado. Entre com sua senha ou solicite outro link abaixo.</p>}
    {!params.error && params.signedout === '1' && <p role="status">Você saiu da sua conta. Para voltar, entre novamente abaixo.</p>}
    {params.next === '/account/password' && <p role="status">Para definir sua senha, primeiro entre na conta. Se o Elo ainda está conectado em outro navegador, abra “Minha senha de acesso” por lá.</p>}
    <LoginForm next={safeReturnPath(params.next)}/>
    <div className="elo-login-help"><Link href="/account/password" prefetch={false}>Definir ou alterar minha senha</Link><p>Se você já está conectado, pode definir sua senha sem solicitar outro e-mail.</p></div>
    <div className="elo-login-help"><Link href="/password-setup" prefetch={false}>Tenho um código de ativação</Link></div>
    <details className="elo-login-alternative"><summary>Preciso de um link para definir minha senha</summary><p>Use esta opção se ainda não tem uma senha e já saiu da conta. Abra o link no mesmo navegador para definir sua senha. O envio depende do serviço de e-mail.</p><EmailLinkForm next="/account/password"/></details>
    <small>Use a senha da sua conta do Elo. A entrada com senha não exige um novo link por e-mail.</small>
  </section></main>;
}
