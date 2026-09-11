import Link from 'next/link';
import ActivationForm from './form';

export const dynamic = 'force-dynamic';
export default function PasswordSetupPage() {
  return <main className="elo-login"><section className="elo-login-card">
    <Link className="elo-login-brand" href="/">elo<span>PEÇAS &amp; EMPRÉSTIMOS</span></Link>
    <h1>Definir minha senha</h1>
    <p>Informe seu e-mail e o código de ativação fornecido para sua conta. Depois, você poderá escolher sua senha.</p>
    <ActivationForm/>
    <small>O código é temporário e pode ser usado uma única vez. Sua senha será escolhida na próxima tela.</small>
    <Link href="/login" className="text-button elo-back-link">Já tenho senha — entrar</Link>
  </section></main>;
}
