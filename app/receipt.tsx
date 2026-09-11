'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Download, MessageCircle, Printer, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { type Loan, loanCount, money } from './domain';
import { receiptContent, receiptDate, signatureDate, hasSignature, type ReceiptContent, type SignedReceipt, type SignatureStrokes } from './receipt-model';
import SignaturePad, { SignatureDrawing } from './signature-pad';
import { whatsappPhone } from './messaging-types';

export type ReceiptSignature = { loanId: string; receiptFingerprint: string; signerName: string; strokes: SignatureStrokes };
export function ReceiptView({ content }: { content: ReceiptContent | SignedReceipt }) {
  const signature = 'signature' in content ? content.signature : null;
  return <article className="receipt-document">
    <div className="receipt-top"><h2>elo <small>PEÇAS & EMPRÉSTIMOS</small></h2><strong>COMPROVANTE DE EMPRÉSTIMO<br/>{content.loanId}</strong></div>
    <p><strong>Assistência:</strong> {content.assistance.name}<br/>{[content.assistance.contact, content.assistance.phone, content.assistance.email, content.assistance.city].filter(Boolean).join(' · ')}</p>
    <p><strong>Lojista:</strong> {content.merchant.name}<br/><strong>Responsável:</strong> {content.merchant.contact}<br/><strong>Retirada:</strong> {receiptDate(content.created)} · <strong>Prazo:</strong> {receiptDate(content.due)}</p>
    <div className="table-scroll"><table><thead><tr><th>Peça</th><th>Qtd.</th><th>Valor unitário</th></tr></thead><tbody>{content.items.map(item => <tr key={item.productId}><td><strong>{item.name}</strong><small>{[item.sku, item.quality, item.compatible].filter(Boolean).join(' · ')}</small></td><td>{item.quantity}</td><td>{item.unitValue > 0 ? money(item.unitValue) : 'Não informado'}</td></tr>)}</tbody></table></div>
    <p><strong>Total dos valores informados:</strong> {money(content.items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0))}</p>
    {content.items.some(item => !item.unitValue) && <p>Há peças sem valor de referência informado.</p>}
    <p><strong>Condições e observações:</strong><br/>{content.notes || 'Nenhuma observação.'}</p>
    <p>{content.statement}</p>
    {signature ? <div className="receipt-signed"><SignatureDrawing strokes={signature.strokes}/><strong>{signature.name}</strong><p>Assinado em {signatureDate(signature.at)} · Horário de Brasília</p><small>Assinatura manuscrita coletada pela assistência. Esta cópia preserva os dados apresentados na assinatura.</small></div> : <div className="receipt-paper-signature"><div/><p>Assinatura de quem recebeu</p><p>Nome: ____________________________________ Data: ____/____/________</p></div>}
  </article>;
}

type ReceiptProps = { loan: Loan; merchant: ReceiptContent['merchant'] & { phone?: string }; assistance: ReceiptContent['assistance']; onClose: () => void; onSign?: (signature: ReceiptSignature) => Promise<boolean> };
export default function ReceiptDialog(props: ReceiptProps) {
  // A concurrent update requires collecting the signature on the new document again.
  return <ReceiptDialogBody key={JSON.stringify(props.loan.receipt || receiptContent(props.loan, props.merchant, props.assistance))} {...props}/>;
}
function ReceiptDialogBody({ loan, merchant, assistance, onClose, onSign }: ReceiptProps) {
  const content = loan.receipt || receiptContent(loan, merchant, assistance);
  const source = JSON.stringify(content);
  const [strokes, setStrokes] = useState<SignatureStrokes>([]);
  const [signerName, setSignerName] = useState(merchant.contact);
  const [error, setError] = useState('');
  const [limited, setLimited] = useState(false);
  const [saving, setSaving] = useState(false);
  const running = useRef(false);
  const [prepared, setPrepared] = useState<{ source: string; file?: File; error?: string }>({ source: '' });
  const file = prepared.source === source ? prepared.file : undefined;
  const canShare = !!file && typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
  const canSign = !!onSign && !loan.receipt && loanCount(loan) > 0;
  const filename = `elo-${loan.id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}${loan.receipt ? '-assinado' : ''}.pdf`;
  useEffect(() => {
    let active = true;
    void import('../lib/receipt-pdf').then(module => module.createReceiptPdf(JSON.parse(source))).then(bytes => {
      if (active) setPrepared({ source, file: new File([new Uint8Array(bytes)], filename, { type: 'application/pdf' }) });
    }).catch(() => { if (active) setPrepared({ source, error: 'Não foi possível preparar o PDF. Você ainda pode imprimir o comprovante.' }); });
    return () => { active = false; };
  }, [source, filename]);
  const download = () => { if (!file) return; const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = file.name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); };
  const message = `Olá! Segue o comprovante ${loan.receipt ? 'assinado ' : ''}do empréstimo ${content.loanId}, da ${content.assistance.name}. Prazo registrado: ${receiptDate(content.due)}.`;
  const phone = whatsappPhone(merchant.phone || '');
  return <>
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="elo-dialog receipt-dialog">
      <DialogHeader><DialogTitle>Comprovante{loan.receipt ? ' assinado' : ' e assinatura'}</DialogTitle><DialogDescription>{loan.receipt ? 'A assinatura foi salva. Compartilhe uma cópia com o lojista.' : canSign ? 'Confira a retirada e entregue o aparelho ao lojista para assinar abaixo.' : 'Consulte as peças e o comprovante desta retirada.'}</DialogDescription></DialogHeader>
      <div className="dialog-body">
        <ReceiptView content={content}/>
        {canSign && <form className="receipt-sign-form" onSubmit={async event => {
          event.preventDefault();
          if (running.current || !onSign || limited || !hasSignature(strokes) || signerName.trim().length < 2) return;
          running.current = true; setSaving(true); setError('');
          try {
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
            const receiptFingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
            if (!await onSign({ loanId: loan.id, signerName, strokes, receiptFingerprint })) setError('A assinatura não foi salva. Confira a mensagem e tente novamente.');
          } catch { setError('Não foi possível salvar a assinatura. Tente novamente.'); }
          finally { running.current = false; setSaving(false); }
        }}>
          <h3>Assinatura do lojista</h3><p className="small">Ao assinar, confirmo o recebimento das peças e quantidades descritas acima.</p>
          <label className="field">Nome de quem assina<input value={signerName} onChange={event => setSignerName(event.target.value)} maxLength={100} minLength={2} required disabled={saving} autoComplete="name"/></label>
          <SignaturePad strokes={strokes} onChange={setStrokes} disabled={saving || limited} onLimit={() => setLimited(true)}/>
          {limited && <p className="form-error" role="alert">O limite do espaço de assinatura foi atingido. Limpe e assine novamente.</p>}
          <div className="button-row"><button className="btn secondary" type="button" disabled={saving} onClick={() => { setStrokes([]); setLimited(false); }}>Limpar assinatura</button><button className="btn primary" type="submit" disabled={saving || limited || !hasSignature(strokes) || signerName.trim().length < 2}><Check size={17}/>{saving ? 'Salvando…' : 'Salvar assinatura'}</button></div>
        </form>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <section className="receipt-share"><h3>{loan.receipt ? 'Enviar comprovante assinado' : 'Cópia do comprovante'}</h3>
          <div className="button-row">
            {canShare && <button className="btn primary" disabled={saving} onClick={() => {
              if (!file) return;
              void navigator.share({ files: [file], title: `Elo · ${content.loanId}` }).catch(reason => { if (reason?.name !== 'AbortError') setError('Não foi possível compartilhar. Baixe o PDF e anexe no WhatsApp.'); });
            }}><Share2 size={17}/>Compartilhar PDF / WhatsApp</button>}
            <button className="btn secondary" disabled={!file || saving} onClick={download}><Download size={17}/>{file ? 'Baixar PDF' : 'Preparando PDF…'}</button>
            <button className="btn secondary" disabled={saving} onClick={() => window.print()}><Printer size={17}/>Imprimir</button>
          </div>
          {canShare ? <p className="small">Escolha o WhatsApp na lista de aplicativos e selecione o contato do lojista.</p> : <p className="small">Baixe o PDF e anexe à conversa no WhatsApp. O botão abaixo abre a mensagem pronta.</p>}
          <a className="text-button" href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/>Abrir conversa no WhatsApp</a>
          {prepared.source === source && prepared.error && <p role="alert" className="form-error">{prepared.error}</p>}
        </section>
      </div>
    </DialogContent></Dialog>
    <div id="print-document"><ReceiptView content={content}/></div>
  </>;
}
