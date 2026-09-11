import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyIdentity } from '../server/identity';
import type { SqlDatabase } from '../server/database';
import { safeReturnPath } from '../lib/auth-path';
import { postgresSql, poolConfig } from '../server/postgres';
import { appOrigin, supabaseConfig } from '../server/config';
import { requestBody } from '../server/http';

for (const input of ['https://evil.example', '//evil.example', '/\\evil.example', '/\n/evil.example', '/auth/callback', '/login', '/a/../auth/logout', '', undefined, ['/portal']]) assert.equal(safeReturnPath(input), '/', String(input));
assert.equal(safeReturnPath('/portal?loan=EMP-0001#details'), '/portal?loan=EMP-0001#details');
assert.equal(safeReturnPath('/?next=https://evil.example'), '/?next=https://evil.example');
assert.equal(postgresSql("SELECT '?', \"?\", $$?$$, $tag$?$tag$, ? -- ?\n/* ? /* ? */ */", 1), "SELECT '?', \"?\", $$?$$, $tag$?$tag$, $1 -- ?\n/* ? /* ? */ */");
assert.throws(() => postgresSql('SELECT ?', 0), /binding count/);
assert.throws(() => postgresSql('SELECT $$?', 0), /Unterminated/);
assert.equal(poolConfig('postgres://user:pass@localhost/elo_test').ssl, false);
assert.deepEqual(poolConfig('postgres://user:pass@db.example/elo?sslmode=disable').ssl, { rejectUnauthorized: true });
assert.ok(!poolConfig('postgres://user:pass@db.example/elo?sslmode=no-verify').connectionString!.includes('sslmode'));
const oldPoolerHost = process.env.DATABASE_POOLER_HOST;
const oldPoolerUser = process.env.DATABASE_POOLER_USER;
try {
  process.env.DATABASE_POOLER_HOST = 'aws-0-sa-east-1.pooler.supabase.com';
  delete process.env.DATABASE_POOLER_USER;
  assert.throws(() => poolConfig('postgres://elo_app:unchanged%40fixture@localhost/elo_test'), /host and user together/);
  process.env.DATABASE_POOLER_USER = 'elo_app.' + 'a'.repeat(20);
  const routed = poolConfig('postgres://elo_app:unchanged%40fixture@localhost:6543/elo_test?sslmode=disable');
  const routedUrl = new URL(routed.connectionString!);
  assert.equal(routedUrl.hostname, 'aws-0-sa-east-1.pooler.supabase.com');
  assert.equal(routedUrl.username, 'elo_app.' + 'a'.repeat(20));
  assert.equal(routedUrl.port, '5432');
  assert.equal(routedUrl.password, 'unchanged%40fixture');
  assert.equal(routedUrl.pathname, '/elo_test');
  assert.deepEqual(routed.ssl, { rejectUnauthorized: true });
  assert.equal(routedUrl.searchParams.has('sslmode'), false);
  process.env.DATABASE_POOLER_HOST = 'attacker.example';
  assert.throws(() => poolConfig('postgres://elo_app:fixture@localhost/elo_test'), /host and user together/);
  process.env.DATABASE_POOLER_HOST = 'aws-0-sa-east-1.pooler.supabase.com';
  process.env.DATABASE_POOLER_USER = 'elo_app@attacker.example';
  assert.throws(() => poolConfig('postgres://elo_app:fixture@localhost/elo_test'), /host and user together/);
} finally {
  if (oldPoolerHost === undefined) delete process.env.DATABASE_POOLER_HOST;
  else process.env.DATABASE_POOLER_HOST = oldPoolerHost;
  if (oldPoolerUser === undefined) delete process.env.DATABASE_POOLER_USER;
  else process.env.DATABASE_POOLER_USER = oldPoolerUser;
}
assert.equal(appOrigin(), 'https://elo.example');
process.env.APP_URL = 'https://elo.example/path'; assert.throws(appOrigin, /HTTPS origin/);
process.env.APP_URL = 'https://elo.example';
process.env.SUPABASE_URL = 'https://project.supabase.co'; process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_wrong';
assert.throws(supabaseConfig, /publishable/);
process.env.SUPABASE_PUBLISHABLE_KEY = 'header.' + Buffer.from('{"role":"service_role"}').toString('base64url') + '.fixture';
assert.throws(supabaseConfig, /publishable/);
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture'; process.env.SUPABASE_URL = 'ftp://localhost';
assert.throws(supabaseConfig, /HTTPS/);

const request = (origin: string | null, content: string, type = 'application/json') => new Request('https://internal-host.local/api/workspace', {
  method: 'POST', headers: { ...(origin ? { origin } : {}), 'content-type': type }, body: content,
});
assert.deepEqual(await requestBody(request('https://elo.example', '{"kind":"ok"}')), { kind: 'ok' });
await assert.rejects(requestBody(request('https://evil.example', '{}')), /Origem/);
await assert.rejects(requestBody(request(null, '{}')), /Origem/);
await assert.rejects(requestBody(request('https://elo.example', '{}', 'text/plain')), /Formato/);
await assert.rejects(requestBody(request('https://elo.example', 'invalid json')), /inválidos/);
await assert.rejects(requestBody(request('https://elo.example', JSON.stringify('a'.repeat(128001)))), /grande/);

const userId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const claims = { sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 60, session_id: sessionId };
const tokenFor = (payload: object) => 'header.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.fixture';
let token: string | undefined = tokenFor(claims);
let revoked = false; let rejected = false; let confirmed = true; let anonymous = false;
let verificationCalls = 0; let databaseCalls = 0;
// Test doubles never contact Supabase or send mail. getUser is the trust boundary.
const supabase = { auth: {
  getSession: async () => ({ data: { session: token ? { access_token: token, user: { id: 'forged-owner', email: 'forged@example.com' } } : null }, error: null }),
  getUser: async (actual: string) => {
    verificationCalls++; assert.equal(actual, token);
    return { data: { user: rejected ? null : { id: userId, email: 'Verified@Example.com', email_confirmed_at: confirmed ? '2026-01-01' : null, is_anonymous: anonymous, user_metadata: { role: 'owner', email: 'forged@example.com' } } }, error: rejected ? Error('invalid signature') : null };
  },
} } as unknown as Pick<SupabaseClient, 'auth'>;
const database = { prepare(sql: string) {
  databaseCalls++; assert.ok(sql.includes('auth.sessions') && sql.includes('not_after'));
  return { bind(id: string, uid: string) { assert.equal(id, sessionId); assert.equal(uid, userId); return { first: async () => revoked ? null : { id: sessionId } }; } };
} } as unknown as SqlDatabase;
const verified = await verifyIdentity(supabase, database);
assert.equal(verified.userId, userId); assert.equal(verified.email, 'verified@example.com'); assert.equal('role' in verified, false);
rejected = true; await assert.rejects(verifyIdentity(supabase, database), /confirmado/); assert.equal(databaseCalls, 1);
rejected = false; confirmed = false; await assert.rejects(verifyIdentity(supabase, database), /confirmado/);
confirmed = true; anonymous = true; await assert.rejects(verifyIdentity(supabase, database), /confirmado/);
anonymous = false;
for (const change of [{ exp: 1 }, { sub: crypto.randomUUID() }, { role: 'service_role' }, { session_id: 'not-uuid' }]) {
  token = tokenFor({ ...claims, ...change }); await assert.rejects(verifyIdentity(supabase, database), /expirou/);
}
token = tokenFor(claims); revoked = true; await assert.rejects(verifyIdentity(supabase, database), /encerrada/);
const prior = verificationCalls; token = undefined; await assert.rejects(verifyIdentity(supabase, database), /Entre/); assert.equal(verificationCalls, prior);
console.log('OK: safe redirects, trusted origin/CSRF, body limits, SQL bindings/TLS, verified Auth identity, forged metadata ignored, invalid/expired/revoked/unconfirmed/anonymous sessions rejected. Auth is mocked.');
