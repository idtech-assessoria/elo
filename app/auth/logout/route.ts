import { NextResponse } from 'next/server';
import { appOrigin } from '../../../server/config';
import { supabaseServer } from '../../../server/supabase';

export const runtime = 'nodejs';
function loginRedirect(path: string) {
  return NextResponse.redirect(new URL(path, appOrigin()), { status: 303, headers: { 'Cache-Control': 'private, no-store' } });
}

// Revisiting a form URL in browser history must not sign out or show a dead end.
export async function GET() {
  return loginRedirect('/login');
}

export async function POST(request: Request) {
  const origin = appOrigin();
  if (request.headers.get('origin') !== origin) return new Response('Origem não autorizada.', { status: 403 });
  try {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) return loginRedirect('/login?error=logout');
    return loginRedirect('/login?signedout=1');
  } catch {
    return loginRedirect('/login?error=logout');
  }
}
