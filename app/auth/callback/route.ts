import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { safeReturnPath } from '../../../lib/auth-path';
import { appOrigin } from '../../../server/config';
import { supabaseServer } from '../../../server/supabase';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const origin = appOrigin();
  const code = new URL(request.url).searchParams.get('code');
  const store = await cookies();
  const next = safeReturnPath(store.get('elo-return')?.value);
  store.delete('elo-return');
  if (code && code.length < 2048) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin), { status: 303, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.redirect(new URL('/login?error=link', origin), { status: 303, headers: { 'Cache-Control': 'private, no-store' } });
}
