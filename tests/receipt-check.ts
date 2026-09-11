import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { createReceiptPdf } from '../lib/receipt-pdf';
import { receiptContent, receiptDate, hasSignature, type SignedReceipt } from '../app/receipt-model';
import { createLoan, seedState, dayOffset, defaultSettings } from '../app/domain';

const state = seedState();
const { loan } = createLoan(state, 'm1', dayOffset(3), { p1: 2, p2: 1 }, 'Conferir as telas antes da instalação. Devolver na embalagem original.');
const content = receiptContent(loan, { id: 'm1', name: 'Loja de teste — documento de validação', contact: 'Responsável de teste' }, { ...defaultSettings, name: 'Assistência de teste', contact: 'Documento de validação', phone: '(31) 90000-0000', email: 'teste@example.com', city: 'Belo Horizonte · MG' });
content.items[1].unitValue = 0;
assert.equal(receiptDate('2026-09-11'), '11/09/2026');
assert.equal(hasSignature([[[1, 1]]]), false);
const signed: SignedReceipt = { ...content, signature: { name: 'Assinatura de teste', at: '2026-09-11T12:30:00.000Z', strokes: [[[80, 250], [220, 90], [130, 270], [280, 160], [250, 250], [380, 160], [330, 260], [480, 200], [440, 270], [560, 190], [530, 250], [650, 210], [740, 230]], [[220, 310], [800, 275]]] } };
assert.equal(hasSignature(signed.signature.strokes), true);
const original = JSON.stringify(signed);
const bytes = await createReceiptPdf(signed);
const pdf = await PDFDocument.load(bytes);
assert.equal(pdf.getPageCount(), 1);
assert.equal(pdf.getTitle(), 'Comprovante ' + content.loanId);
assert.equal(JSON.stringify(signed), original, 'PDF export must not mutate the saved signature');
const long: SignedReceipt = { ...signed, notes: 'Condições combinadas e conferidas. '.repeat(40), signature: { ...signed.signature, name: 'Responsável com nome longo '.repeat(3) }, items: Array.from({ length: 100 }, (_, index) => ({ ...signed.items[0], productId: 'p' + index, name: 'Peça ' + index + ' — descrição longa '.repeat(8), compatible: 'Modelos compatíveis '.repeat(8), quality: 'Nova · testada 🔧', sku: 'ELO-' + String(index).padStart(5, '0') })) };
const longBytes = await createReceiptPdf(long);
const longPdf = await PDFDocument.load(longBytes);
assert.ok(longPdf.getPageCount() > 5 && longPdf.getPageCount() < 30);
const unsigned = await createReceiptPdf(content);
assert.equal((await PDFDocument.load(unsigned)).getPageCount(), 1);
// Local QA only; no operational fixtures or generated PDFs are published.
if (process.env.ELO_PDF_OUTPUT) {
  mkdirSync(process.env.ELO_PDF_OUTPUT, { recursive: true });
  writeFileSync(join(process.env.ELO_PDF_OUTPUT, 'signed.pdf'), bytes);
  writeFileSync(join(process.env.ELO_PDF_OUTPUT, 'unsigned.pdf'), unsigned);
  writeFileSync(join(process.env.ELO_PDF_OUTPUT, 'long.pdf'), longBytes);
}
console.log(`OK: signed/unsigned PDF, immutable snapshot, date formatting, missing price, signature strokes and ${longPdf.getPageCount()}-page long receipt.`);
