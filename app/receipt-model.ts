import type { Loan, Merchant, Settings } from './domain';

export type SignaturePoint = [number, number];
export type SignatureStrokes = SignaturePoint[][];
export type ReceiptContent = {
  version: 1;
  loanId: string;
  created: string;
  due: string;
  notes: string;
  statement: string;
  assistance: Pick<Settings, 'name' | 'contact' | 'email' | 'phone' | 'city'>;
  merchant: Pick<Merchant, 'id' | 'name' | 'contact'>;
  items: { productId: string; name: string; sku: string; quality: string; compatible: string; quantity: number; unitValue: number }[];
};
export type SignedReceipt = ReceiptContent & { signature: { name: string; strokes: SignatureStrokes; at: string } };
export const receiptStatement = 'Recebi da assistência as peças e quantidades descritas neste comprovante, com o prazo e as condições acima.';
export function receiptContent(loan: Loan, merchant: ReceiptContent['merchant'], assistance: ReceiptContent['assistance']): ReceiptContent {
  return {
    version: 1, loanId: loan.id, created: loan.created, due: loan.due, notes: loan.notes, statement: receiptStatement,
    assistance: { name: assistance.name, contact: assistance.contact, email: assistance.email, phone: assistance.phone, city: assistance.city },
    merchant: { id: merchant.id, name: merchant.name, contact: merchant.contact },
    items: loan.items.map(i => ({ productId: i.productId, name: i.name, sku: i.sku, quality: i.quality, compatible: i.compatible || '', quantity: i.quantity, unitValue: i.unitValue })),
  };
}
export const receiptDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value.slice(0, 10) + 'T12:00:00Z'));
export const signatureDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
export function hasSignature(strokes: SignatureStrokes): boolean {
  return strokes.some(stroke => stroke.length > 1 && stroke.some(([x, y]) => Math.hypot(x - stroke[0][0], y - stroke[0][1]) >= 8));
}
