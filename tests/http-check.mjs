import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const owner = 'owner@example.com';
const calls = [];
let logoutFailure = false;
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({ sub: '11111111-1111-4111-8111-111111111111', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated', session_id: '22222222-2222-4222-8222-222222222222' })).toString('base64url') + '.fixture';
const mock = createServer(async (request, response) => {
  let body = ''; for await (const chunk of request) body += chunk;
  calls.push({ path: request.url, body: body ? JSON.parse(body) : null });
  response.setHeader('Content-Type', 'application/json');
  if (request.url.startsWith('/auth/v1/otp')) response.end('{}');
  else if (request.url.startsWith('/auth/v1/token')) response.end(JSON.stringify({ access_token: token, refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user: { id: '11111111-1111-4111-8111-111111111111', email: owner, email_confirmed_at: '2026-01-01T00:00:00Z', aud: 'authenticated' } }));
  else if (request.url.startsWith('/auth/v1/user')) response.end(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', email: owner, email_confirmed_at: '2026-01-01T00:00:00Z', aud: 'authenticated' }));
  else if (request.url.startsWith('/auth/v1/logout')) {
    response.statusCode = logoutFailure ? 500 : 204;
    response.end(logoutFailure ? '{"message":"simulated provider outage"}' : '');
  }
  else { response.statusCode = 400; response.end('{"message":"mock: unexpected endpoint"}'); }
});
mock.listen(0, '127.0.0.1'); await once(mock, 'listening');
const mockPort = mock.address().port;
const reserve = createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
let output = '';
const server = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env: {
  ...process.env, NEXT_TELEMETRY_DISABLED: '1', APP_URL: origin,
  SUPABASE_URL: `http://127.0.0.1:${mockPort}`, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock_only',
  ELO_OWNER_EMAIL: owner, ELO_OWNER_USER_ID: '', DATABASE_URL: 'postgres://fixture:fixture@127.0.0.1:65531/elo_test',
}, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
try {
  const deadline = Date.now() + 30000;
  while (true) {
    try { if ((await fetch(origin + '/login')).ok) break; } catch { /* Wait for the local server to listen. */ }
    if (Date.now() > deadline || server.exitCode !== null) throw Error('Next.js did not start: ' + output);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const page = await fetch(origin + '/login'); assert.match(await page.text(), /PEÇAS.*EMPRÉSTIMOS/);
  assert.match(page.headers.get('cache-control'), /no-store/);
  const protectedPage = await fetch(origin + '/portal', { redirect: 'manual' });
  assert.equal(protectedPage.status, 307); assert.match(protectedPage.headers.get('location'), /^\/login\?next=/);
  const send = (route, requestOrigin, body) => fetch(origin + route, { method: 'POST', redirect: 'manual', headers: { origin: requestOrigin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await send('/auth/login', 'https://evil.example', { email: owner })).status, 403);
  assert.equal((await send('/auth/logout', 'https://evil.example', {})).status, 403);
  assert.equal(calls.length, 0);
  const login = await send('/auth/login', origin, { email: owner, next: '//evil.example' });
  assert.equal(login.status, 200, await login.text());
  const otp = calls.find(c => c.path.startsWith('/auth/v1/otp'));
  assert.equal(otp.body.email, owner); assert.equal(otp.body.code_challenge_method, 's256');
  assert.ok(otp.path.includes(encodeURIComponent(origin + '/auth/callback')));
  const cookies = login.headers.getSetCookie();
  assert.ok(cookies.some(cookie => /code-verifier/.test(cookie) && /HttpOnly/i.test(cookie) && /Secure/i.test(cookie) && /SameSite=lax/i.test(cookie)));
  const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
  const callback = await fetch(origin + '/auth/callback?code=fixture-code&next=https://evil.example', { redirect: 'manual', headers: { cookie: cookieHeader } });
  assert.equal(callback.status, 303); assert.equal(callback.headers.get('location'), origin + '/');
  const exchange = calls.find(c => c.path.startsWith('/auth/v1/token'));
  assert.equal(exchange.body.auth_code, 'fixture-code');
  assert.equal(createHash('sha256').update(exchange.body.code_verifier).digest('base64url'), otp.body.code_challenge);
  assert.match(callback.headers.get('cache-control'), /no-store/);
  assert.ok(callback.headers.getSetCookie().some(cookie => /auth-token=/.test(cookie) && /HttpOnly/i.test(cookie)));
  const sessionCookie = callback.headers.getSetCookie().filter(cookie => /auth-token=/.test(cookie)).map(cookie => cookie.split(';')[0]).join('; ');
  const logout = cookie => fetch(origin + '/auth/logout', { method: 'POST', redirect: 'manual', headers: { origin, cookie } });
  // Provider failure must still render a navigable login, never strand the browser on JSON.
  logoutFailure = true;
  const failedLogout = await logout(sessionCookie);
  assert.equal(failedLogout.status, 303, 'Logout failure must return to the login form');
  assert.equal(failedLogout.headers.get('location'), origin + '/login?error=logout');
  const failurePage = await fetch(failedLogout.headers.get('location'));
  const failureHtml = await failurePage.text();
  assert.match(failureHtml, /Não foi possível confirmar a saída/);
  assert.match(failureHtml, /Entrar no Elo/);
  assert.match(failureHtml, /name="email"/);
  // Login must not depend on refreshing an old cookie or contacting Auth.
  const authCalls = calls.length;
  assert.equal((await fetch(origin + '/login', { headers: { cookie: sessionCookie } })).status, 200);
  const [cookieName, encodedSession] = sessionCookie.split('=');
  const expiredSession = JSON.parse(Buffer.from(decodeURIComponent(encodedSession).replace(/^base64-/, ''), 'base64url').toString());
  expiredSession.expires_at = 1;
  const expiredCookie = cookieName + '=base64-' + Buffer.from(JSON.stringify(expiredSession)).toString('base64url');
  assert.equal((await fetch(origin + '/login', { headers: { cookie: expiredCookie } })).status, 200);
  assert.equal(calls.length, authCalls, 'Public login must not refresh an old session');
  const revisitLogout = await fetch(origin + '/auth/logout', { redirect: 'manual', headers: { cookie: sessionCookie } });
  assert.equal(revisitLogout.status, 303);
  assert.equal(revisitLogout.headers.get('location'), origin + '/login');
  assert.equal(calls.length, authCalls, 'GET logout must not revoke a session');
  logoutFailure = false;
  const signedOut = await logout(sessionCookie);
  assert.equal(signedOut.status, 303);
  assert.equal(signedOut.headers.get('location'), origin + '/login?signedout=1');
  assert.ok(calls.some(c => c.path === '/auth/v1/logout?scope=local'));
  assert.ok(signedOut.headers.getSetCookie().some(cookie => /auth-token=;/.test(cookie) && /Max-Age=0/i.test(cookie)));
  const logoutPage = await fetch(signedOut.headers.get('location'));
  const logoutHtml = await logoutPage.text();
  assert.match(logoutHtml, /Você saiu da sua conta/);
  assert.match(logoutHtml, /Entrar no Elo/);
  assert.match(logoutHtml, /name="email"/);
  assert.equal((await logout('')).status, 303, 'Signing out twice must keep the login reachable');
  const homeAfterLogout = await fetch(origin + '/', { redirect: 'manual' });
  assert.equal(homeAfterLogout.status, 307);
  assert.equal(homeAfterLogout.headers.get('location'), '/login?next=%2F');
  // A fresh login after logout creates a new PKCE verifier and can exchange a new link.
  const loginAgain = await send('/auth/login', origin, { email: owner, next: '/' });
  assert.equal(loginAgain.status, 200);
  const newOtp = calls.filter(c => c.path.startsWith('/auth/v1/otp')).at(-1);
  assert.notEqual(newOtp.body.code_challenge, otp.body.code_challenge);
  const callbackAgain = await fetch(origin + '/auth/callback?code=new-fixture-code', { redirect: 'manual', headers: { cookie: loginAgain.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ') } });
  assert.equal(callbackAgain.status, 303);
  assert.equal(callbackAgain.headers.get('location'), origin + '/');
  assert.ok(callbackAgain.headers.getSetCookie().some(cookie => /auth-token=/.test(cookie) && !/Max-Age=0/i.test(cookie)));
  const invalid = await fetch(origin + '/auth/callback?next=https://evil.example', { redirect: 'manual' });
  assert.equal(invalid.status, 303); assert.equal(invalid.headers.get('location'), origin + '/login?error=link');
  console.log('OK: production Next.js HTTP routes, public login, protected redirects, CSRF, PKCE, HttpOnly/Secure cookies, logout/re-entry, repeated logout and recoverable provider failure. Auth HTTP is local and simulated; no email sent.');
} finally {
  server.kill('SIGTERM'); await once(server, 'exit');
  await new Promise(resolve => mock.close(resolve));
}
