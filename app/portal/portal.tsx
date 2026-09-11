'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Link2, Store, ArrowLeftRight, CalendarDays, Printer } from 'lucide-react';
import { fetchJson } from '../../lib/api-client';
import { remaining, loanCount, loanStatus, money, dateLabel } from '../domain';
import ReceiptDialog from '../receipt';
import type { portalSnapshot } from '../../server/repository';
type Data = ReturnType<typeof portalSnapshot>;

export default function Portal() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const load = () => fetchJson<Data>('/api/portal').then(value => { setData(value); setError(''); }).catch(reason => setError((reason as Error).message));
  useEffect(() => { void load(); }, []);
  if (error) return <main className="connection-screen"><Store size={34}/><h1>Acesso ao portal do lojista</h1><p>{error}</p><p>Entre com o e-mail cadastrado pela assistência. O portal deve estar habilitado para esse mesmo e-mail.</p><Link className="btn primary" href="/login?next=%2Fportal" prefetch={false}>Entrar novamente</Link><button className="text-button" onClick={load}>Tentar carregar novamente</button><Link className="text-button" href="/">Voltar à assistência</Link></main>;
  if (!data) return <main className="connection-screen"><Store size={34}/><h1>Carregando seus empréstimos</h1><p>Buscando suas peças e comprovantes.</p></main>;
  const receipt = data.loans.find(loan => loan.id === receiptId);
  const active = data.loans.filter(loan => loanCount(loan) > 0);
  return <div className="portal-app">
    <header className="portal-topbar"><div className="brand"><span className="brand-mark"><Link2 size={28}/></span><div>elo<span>PORTAL DO LOJISTA</span></div></div><div><strong>{data.merchant.name}</strong><span>{data.actor.email}</span></div></header>
    <main className="portal-content">
      <div className="page-heading"><div><span className="eyebrow">{data.assistance.name}</span><h1>Meus empréstimos</h1><p>Consulte as peças que retirou, os prazos e seus comprovantes.</p></div><div className="heading-actions"><button className="btn secondary" onClick={load}>Atualizar</button><Link className="btn secondary" href="/account/password">Minha senha</Link><form action="/auth/logout" method="post"><button className="btn secondary" type="submit">Sair</button></form></div></div>
      <div className="info-box"><ArrowLeftRight size={20}/><span>{active.reduce((sum, loan) => sum + loanCount(loan), 0)} peça(s) pendentes em {active.length} empréstimo(s). Para devoluções ou ajustes, fale com a assistência.</span></div>
      <div className="portal-loans">{data.loans.map(loan => <article className="panel portal-loan" key={loan.id}>
        <div className="panel-heading"><div><h2>{loan.id}</h2><p><CalendarDays size={14} style={{ display: 'inline' }}/> Retirada em {dateLabel(loan.created)} · Devolução até {dateLabel(loan.due)}</p></div><span className={'badge ' + (loanStatus(loan) === 'Atrasado' ? 'red' : 'green')}>{loanStatus(loan)}</span></div>
        {loan.items.map(item => <div className="portal-item" key={item.productId}><div><strong>{item.name}</strong><small>{[item.sku, item.quality, item.compatible].filter(Boolean).join(' · ')}</small><small>{item.quantity} retirada(s) · {item.returned} devolvida(s) · {item.sold} convertida(s) em venda</small></div><div><strong>{remaining(item)} pendente(s)</strong><small>{item.unitValue > 0 ? money(item.unitValue) + ' por unidade' : 'Valor não informado'}</small></div></div>)}
        {loan.notes && <div className="portal-loan-notes"><strong>Condições e observações</strong><p>{loan.notes}</p></div>}
        <div className="portal-loan-notes"><p>{loan.receipt ? 'Comprovante assinado disponível para consulta e download.' : 'Comprovante de retirada disponível. A assinatura é coletada pela assistência.'}</p></div>
        <div className="portal-loan-actions"><button className="btn secondary" onClick={() => setReceiptId(loan.id)}><Printer size={17}/>{loan.receipt ? 'Ver comprovante assinado' : 'Ver comprovante'}</button></div>
      </article>)}</div>
      {!data.loans.length && <div className="empty-state"><Store size={30}/><h3>Nenhum empréstimo registrado</h3><p>Suas retiradas aparecerão aqui quando forem registradas pela assistência.</p></div>}
    </main>
    {receipt && <ReceiptDialog loan={receipt} merchant={data.merchant} assistance={data.assistance} onClose={() => setReceiptId(null)}/>}
  </div>;
}
