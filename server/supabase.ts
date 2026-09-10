import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig } from './config';

export async function supabaseServer(readOnly = false) {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // Page components are read-only; proxy.ts refreshes cookies before rendering.
        if (readOnly) return;
        values.forEach(({ name, value, options }) => store.set(name, value, options));
      },
    },
  });
}
