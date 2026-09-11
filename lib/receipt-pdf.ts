import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { money } from '../app/domain';
import { receiptDate, signatureDate, type ReceiptContent, type SignedReceipt } from '../app/receipt-model';

/** The PDF is made locally from the already-authorized snapshot; no external upload. */
export async function createReceiptPdf(receipt: ReceiptContent | SignedReceipt): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Comprovante ' + receipt.loanId);
  pdf.setAuthor(receipt.assistance.name);
  pdf.setSubject('Peças emprestadas a ' + receipt.merchant.name);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const supported = new Set(regular.getCharacterSet());
  const clean = (value: string) => Array.from(value.normalize('NFC')).map(c => c === '\n' || supported.has(c.codePointAt(0)!) ? c : '?').join('');
  const ink = rgb(0.14, 0.24, 0.19), muted = rgb(0.36, 0.42, 0.38), line = rgb(0.81, 0.86, 0.82);
  const left = 40, right = 555, width = right - left, bottom = 55;
  let page!: PDFPage; let y = 0;
  const text = (value: string, x: number, yy: number, size = 10, font = regular, color = ink) => page.drawText(clean(value), { x, y: yy, size, font, color });
  const wrap = (value: string, max: number, size = 10, font: PDFFont = regular) => {
    const lines: string[] = [];
    for (const paragraph of clean(value).split('\n')) {
      let current = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = current ? current + ' ' + word : word;
        if (font.widthOfTextAtSize(candidate, size) <= max) { current = candidate; continue; }
        if (current) { lines.push(current); current = ''; }
        for (const character of word) {
          if (font.widthOfTextAtSize(current + character, size) > max && current) { lines.push(current); current = ''; }
          current += character;
        }
      }
      lines.push(current);
    }
    return lines;
  };
  const newPage = () => {
    page = pdf.addPage([595.28, 841.89]); y = 758;
    text('elo', left, 797, 28, bold);
    text('PEÇAS & EMPRÉSTIMOS', 98, 804, 8, bold);
    text('COMPROVANTE DE EMPRÉSTIMO', 303, 803, 10, bold);
    page.drawLine({ start: { x: left, y: 782 }, end: { x: right, y: 782 }, thickness: 1.4, color: ink });
    text(receipt.loanId, left, y, 17, bold); y -= 26;
  };
  const ensure = (height: number) => { if (y - height < bottom) newPage(); };
  const paragraph = (value: string, size = 10, font = regular, color = ink) => {
    for (const valueLine of wrap(value, width, size, font)) { ensure(size + 6); text(valueLine, left, y, size, font, color); y -= size + 5; }
  };
  newPage();
  paragraph('Assistência: ' + receipt.assistance.name, 11, bold);
  paragraph([receipt.assistance.contact, receipt.assistance.phone, receipt.assistance.email, receipt.assistance.city].filter(Boolean).join(' | '), 9, regular, muted);
  y -= 5;
  paragraph('Lojista: ' + receipt.merchant.name, 11, bold);
  if (receipt.merchant.contact) paragraph('Responsável: ' + receipt.merchant.contact, 9, regular, muted);
  paragraph('Retirada: ' + receiptDate(receipt.created) + '   |   Devolução prevista: ' + receiptDate(receipt.due)); y -= 14;
  const tableHead = () => {
    ensure(35);
    page.drawRectangle({ x: left, y: y - 8, width, height: 23, color: rgb(0.94, 0.96, 0.93) });
    text('Qtd.', left + 6, y, 9, bold); text('Peça / identificação / condição', left + 43, y, 9, bold);
    text('Valor unitário', 389, y, 9, bold); text('Referência total', 471, y, 9, bold); y -= 28;
  };
  tableHead();
  for (const item of receipt.items) {
    const title = wrap(item.name, 298, 10, bold);
    const info = wrap([item.sku, item.quality, item.compatible].filter(Boolean).join(' | '), 298, 8);
    const height = title.length * 14 + info.length * 11 + 15;
    if (y - height < bottom) { newPage(); tableHead(); }
    text(String(item.quantity), left + 6, y, 10, bold);
    text(item.unitValue > 0 ? money(item.unitValue) : 'Não informado', 389, y, 8);
    text(item.unitValue > 0 ? money(item.unitValue * item.quantity) : '-', 471, y, 8);
    let yy = y;
    title.forEach(value => { text(value, left + 43, yy, 10, bold); yy -= 14; });
    info.forEach(value => { text(value, left + 43, yy, 8, regular, muted); yy -= 11; });
    y -= height;
    page.drawLine({ start: { x: left, y: y + 13 }, end: { x: right, y: y + 13 }, color: line, thickness: 0.5 });
  }
  y -= 10; ensure(65);
  paragraph('Valor de referência informado: ' + money(receipt.items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0)), 11, bold);
  const unpriced = receipt.items.filter(item => item.unitValue === 0).length;
  if (unpriced) paragraph(`${unpriced} item(ns) sem valor cadastrado. O total acima considera somente os valores informados.`, 9, regular, muted);
  y -= 12; ensure(40);
  paragraph('Condições da retirada', 11, bold);
  paragraph(receipt.notes || 'Nenhuma observação adicional.');
  y -= 12;
  const statementLines = wrap(receipt.statement, width, 10);
  const signatureHeight = 'signature' in receipt ? 230 + wrap('Assinado por: ' + receipt.signature.name, width, 10, bold).length * 15 : 115;
  ensure(statementLines.length * 15 + signatureHeight);
  paragraph(receipt.statement);
  if ('signature' in receipt) {
    const scale = 0.38, x = left + 58, top = y - 3;
    receipt.signature.strokes.forEach(stroke => {
      for (let i = 1; i < stroke.length; i++) page.drawLine({ start: { x: x + stroke[i - 1][0] * scale, y: top - stroke[i - 1][1] * scale }, end: { x: x + stroke[i][0] * scale, y: top - stroke[i][1] * scale }, thickness: 1.35, color: ink });
    });
    y -= 165;
    page.drawLine({ start: { x: left + 35, y }, end: { x: right - 35, y }, color: line, thickness: 0.7 }); y -= 17;
    paragraph('Assinado por: ' + receipt.signature.name, 10, bold);
    paragraph('Assinatura coletada em ' + signatureDate(receipt.signature.at) + ' (Brasília).', 9, regular, muted);
    paragraph('Cópia preservada dos dados apresentados no momento da assinatura.', 8, regular, muted);
  } else {
    y -= 48;
    page.drawLine({ start: { x: left + 35, y }, end: { x: right - 35, y }, color: ink, thickness: 0.8 }); y -= 20;
    paragraph('Assinatura do lojista', 10, bold);
    paragraph('Nome: ____________________________________    Data: ____/____/________', 9);
  }
  const pages = pdf.getPages();
  for (let index = 0; index < pages.length; index++) {
    pages[index].drawLine({ start: { x: left, y: 39 }, end: { x: right, y: 39 }, thickness: 0.5, color: line });
    pages[index].drawText(clean(`${receipt.loanId} | Comprovante de retirada | Página ${index + 1} de ${pages.length}`), { x: left, y: 25, size: 8, font: regular, color: muted });
  }
  return pdf.save();
}
