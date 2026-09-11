'use client';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { type Piece, uid } from './domain';

export default function PieceForm({ piece, pieces, onClose, onSave }: { piece: Piece | 'new' | null; pieces: Piece[]; onClose: () => void; onSave: (piece: Piece) => void }) {
  const editing = piece && piece !== 'new' ? piece : null;
  return <Dialog open={!!piece} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="elo-dialog">
    <DialogHeader><DialogTitle>{editing ? 'Editar peça' : 'Cadastrar peça'}</DialogTitle><DialogDescription>Todos os campos são opcionais. Nome e código são preenchidos automaticamente quando deixados em branco.</DialogDescription></DialogHeader>
    <form onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const str = (key: string) => String(form.get(key) || '').trim();
      const sku = str('sku').toUpperCase();
      if (sku && pieces.some(p => p.sku.toUpperCase() === sku && p.id !== editing?.id)) { toast.error('Este código já está cadastrado. Use outra identificação ou deixe em branco.'); return; }
      const saved: Piece = { id: editing?.id || uid('p'), name: str('name'), sku, category: str('category'), compatible: str('compatible'), quality: str('quality'), location: str('location'), available: editing?.available ?? Number(form.get('quantity')), quarantine: editing?.quarantine || 0, minimum: Number(form.get('minimum')), cost: Math.round(Number(form.get('cost')) * 100), value: Math.round(Number(form.get('value')) * 100) };
      if (![saved.available, saved.minimum, saved.cost, saved.value].every(n => Number.isSafeInteger(n) && n >= 0) || saved.available > 99999 || saved.minimum > 99999 || saved.cost > 100000000 || saved.value > 100000000) { toast.error('Confira as quantidades e os valores informados.'); return; }
      onSave(saved);
    }}>
      <div className="dialog-body">
        <label className="field">Nome da peça<input name="name" maxLength={200} placeholder="Ex.: Tela iPhone 13" defaultValue={editing?.name}/></label>
        <div className="form-grid">
          <label className="field">SKU / identificação<input name="sku" maxLength={40} placeholder="Gerado automaticamente" defaultValue={editing?.sku}/></label>
          <label className="field">Categoria<select name="category" defaultValue={editing?.category || ''}><option value="">Não informar</option>{['Telas','Baterias','Tampas','Face ID','Flex','Câmeras','Conectores','Outras peças'].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <label className="field">Modelos compatíveis<input name="compatible" maxLength={200} placeholder="Ex.: iPhone 15" defaultValue={editing?.compatible}/></label>
        <div className="form-grid">
          <label className="field">Qualidade / condição<input name="quality" maxLength={200} placeholder="Ex.: Original retirada · testada" defaultValue={editing?.quality}/></label>
          <label className="field">Localização<input name="location" maxLength={200} placeholder="Ex.: Gaveta A-01" defaultValue={editing?.location}/></label>
          {!editing && <label className="field">Quantidade inicial<input name="quantity" type="number" min={0} max={99999} step={1} placeholder="0"/></label>}
          <label className="field">Estoque mínimo<input name="minimum" type="number" min={0} max={99999} step={1} placeholder="0" defaultValue={editing?.minimum}/></label>
          <label className="field">Custo unitário (R$)<input name="cost" type="number" min={0} max={1000000} step="0.01" placeholder="Não informado" defaultValue={editing ? editing.cost / 100 : undefined}/></label>
          <label className="field">Valor de referência (R$)<input name="value" type="number" min={0} max={1000000} step="0.01" placeholder="Não informado" defaultValue={editing ? editing.value / 100 : undefined}/></label>
        </div>
        <p className="small">Quantidades em branco começam em zero. Se a peça não tiver valor cadastrado, informe o preço ao converter o empréstimo em venda.</p>
        {editing && <p className="small">O saldo muda por entradas e empréstimos. Os comprovantes já assinados são preservados.</p>}
      </div>
      <div className="dialog-footer"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" type="submit"><Check size={17}/>{editing ? 'Salvar alterações' : 'Cadastrar peça'}</button></div>
    </form>
  </DialogContent></Dialog>;
}
