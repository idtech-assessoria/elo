export function appOrigin(): string {
  const value = process.env.APP_URL;
  if (!value) throw new Error('APP_URL is required');
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('APP_URL must be an HTTPS origin (HTTP is allowed for localhost)');
  }
  return url.origin;
}

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase Auth is not configured');
  const parsed = new URL(url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('Supabase requires an HTTPS origin');
  if (!key.startsWith('sb_publishable_')) {
    // Legacy anon keys remain supported; service-role/secret keys are forbidden.
    try {
      const parts = key.split('.');
      if (parts.length !== 3 || JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role !== 'anon') throw new Error('Wrong key');
    } catch { throw new Error('Use a publishable Supabase key'); }
  }
  return { url: parsed.origin, key };
}

export function bootstrapOwner() {
  return {
    id: process.env.ELO_OWNER_USER_ID?.trim() || '',
    email: process.env.ELO_OWNER_EMAIL?.trim().toLowerCase() || '',
  };
}
