'use client';
import { useEffect, useRef, type PointerEvent } from 'react';
import type { SignaturePoint, SignatureStrokes } from './receipt-model';

export function SignatureDrawing({ strokes }: { strokes: SignatureStrokes }) {
  return <svg viewBox="0 0 1000 400" className="receipt-signature-drawing" aria-label="Assinatura manuscrita" role="img">{strokes.map((stroke, index) => <polyline key={index} points={stroke.map(point => point.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>)}</svg>;
}
export default function SignaturePad({ strokes, onChange, disabled, onLimit }: { strokes: SignatureStrokes; onChange: (value: SignatureStrokes) => void; disabled: boolean; onLimit: () => void }) {
  const surface = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const drawing = useRef<SignatureStrokes>(strokes);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    // Stay non-scrollable between strokes too. Native, non-passive listeners
    // complement touch-action on iOS without locking the rest of the receipt.
    const preventScroll = (event: TouchEvent) => { if (event.cancelable) event.preventDefault(); };
    const events = ['touchstart', 'touchmove', 'touchend'] as const;
    for (const type of events) element.addEventListener(type, preventScroll, { passive: false, capture: true });
    return () => { for (const type of events) element.removeEventListener(type, preventScroll, true); };
  }, []);
  const point = (event: PointerEvent<HTMLDivElement>): SignaturePoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.round(Math.max(0, Math.min(1000, (event.clientX - rect.left) / rect.width * 1000))), Math.round(Math.max(0, Math.min(400, (event.clientY - rect.top) / rect.height * 400)))];
  };
  const publish = (next: SignatureStrokes) => { drawing.current = next; onChange(next); };
  const finishStroke = (event: PointerEvent<HTMLDivElement>) => {
    if (active.current === event.pointerId) active.current = null;
  };
  return <div ref={surface} className={`signature-pad${disabled ? ' disabled' : ''}`} role="img" aria-label="Espaço para o lojista assinar com o dedo ou mouse"
    onContextMenu={event => event.preventDefault()}
    onPointerDown={event => {
      if (disabled || active.current !== null || event.button !== 0) return;
      if (strokes.length >= 50 || strokes.reduce((sum, stroke) => sum + stroke.length, 0) >= 2500) { onLimit(); return; }
      event.preventDefault();
      active.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      publish([...strokes, [point(event)]]);
    }}
    onPointerMove={event => {
      if (disabled || active.current !== event.pointerId) return;
      event.preventDefault();
      const current = drawing.current;
      const last = current.at(-1)!;
      if (last.length >= 500 || current.reduce((sum, stroke) => sum + stroke.length, 0) >= 2500) { active.current = null; onLimit(); return; }
      const nextPoint = point(event);
      const previous = last.at(-1)!;
      if (Math.hypot(previous[0] - nextPoint[0], previous[1] - nextPoint[1]) < 2) return;
      publish([...current.slice(0, -1), [...last, nextPoint]]);
    }}
    onPointerUp={finishStroke} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke}>
    <svg viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="400" fill="transparent"/>
      {strokes.map((stroke, index) => <polyline key={index} points={stroke.map(value => value.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>)}
    </svg>
    {!strokes.length && <span className="signature-placeholder">Assine aqui com o dedo ou mouse</span>}
  </div>;
}
