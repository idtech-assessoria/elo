import { NextResponse } from 'next/server';
import { appOrigin } from '../../../server/config';
import { supabaseServer } from '../../../server/supabase';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const origin = appOrigin();
  if (request.headers.get('origin') !== origin) return new Response('Origem não autorizada.', { status: 403 });
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) return Response.json({ error: 'Não foi possível encerrar a sessão. Tente novamente.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  return NextResponse.redirect(new URL('/login', origin), { status: 303, headers: { 'Cache-Control': 'private, no-store' } });
}
