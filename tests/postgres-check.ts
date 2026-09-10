import assert from 'node:assert/strict';
import { postgresFixture } from './postgres-fixture';
import { Repository, portalSnapshot } from '../server/repository';
import { Messaging } from '../server/outbox';
import { assertActiveSession } from '../server/session';
import { AppError } from '../server/commands';
import { balance, dayOffset } from '../app/domain';

const fixture = await postgresFixture();
const { db, admin, real } = fixture;
try {
  const tables = await admin.query("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'");
  assert.equal(tables.rows.length, 14);
  assert.ok(tables.rows.every(t => t.rowsecurity));
  for (const role of ['anon', 'authenticated']) for (const table of tables.rows) {
    for (const permission of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      const grant = await admin.query('SELECT has_table_privilege($1,$2,$3) AS allowed', [role, 'public.' + table.tablename, permission]);
      assert.equal(grant.rows[0].allowed, false, `${role} cannot ${permission} ${table.tablename}`);
    }
  }
  const client = await admin.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE elo_backend');
    await client.query('SELECT id,user_id,not_after FROM auth.sessions');
    await assert.rejects(client.query('SELECT private_fixture FROM auth.sessions'), /permission denied/);
  } finally { await client.query('ROLLBACK'); client.release(); }

  const ownerId = '11111111-1111-4111-8111-111111111111';
  const partnerId = '22222222-2222-4222-8222-222222222222';
  const strangerId = '33333333-3333-4333-8333-333333333333';
  const repo = new Repository(db, { id: ownerId, email: 'owner@example.com' });
  await assert.rejects(repo.actor({ userId: strangerId, email: 'owner@example.com', displayName: 'Stranger' }), /configurada/);
  const owner = await repo.actor({ userId: ownerId, email: 'owner@example.com', displayName: 'Owner fixture' });
  let snapshot = await repo.read(owner);
  assert.equal(snapshot.state.pieces.length, 0);
  await assert.rejects(db.prepare('UPDATE workspaces SET owner_id=? WHERE id=?').bind('sites-user-not-a-uuid', 'primary').run(), /uuid/);
  const execute = async (command: unknown, actor = owner) => {
    const result = await repo.execute(actor, crypto.randomUUID(), snapshot.revision, command);
    snapshot = result; return result;
  };
  const piece = await execute({ kind: 'piece.save', piece: { name: 'Test screen', sku: 'PG-1', category: 'Telas', compatible: 'Test', quality: 'Nova', location: 'Test', available: 4, minimum: 1, cost: 5000, value: 10000 } });
  const pieceId = String(piece.result.id);
  const createMerchant = (name: string, email: string) => execute({ kind: 'merchant.save', merchant: { name, contact: 'Test', email, phone: '', city: 'Test', limit: 100000, active: true, portalEnabled: true } });
  const merchantId = String((await createMerchant('Test merchant', 'partner@example.com')).result.id);
  const otherMerchantId = String((await createMerchant('Other merchant', 'other@example.com')).result.id);
  await assert.rejects(createMerchant('Duplicate identity', 'partner@example.com'));
  snapshot = await repo.read(owner);
  const partner = await repo.actor({ userId: partnerId, email: 'partner@example.com', displayName: 'Partner fixture' });
  await assert.rejects(repo.actor({ userId: strangerId, email: 'partner@example.com', displayName: 'Stranger' }), /outra identidade/);
  await assert.rejects(repo.read({ ...owner, id: strangerId }), /revogado/);
  const command = { kind: 'loan.create', merchantId, due: dayOffset(3), items: { [pieceId]: 2 }, notes: '<script>test</script>' };
  const commandId = crypto.randomUUID(); const revision = snapshot.revision;
  snapshot = await repo.execute(owner, commandId, revision, command);
  const loanId = snapshot.state.loans[0].id;
  await repo.execute(owner, commandId, revision, command);
  assert.equal((await repo.read(owner)).state.loans.length, 1);
  await assert.rejects(repo.execute(owner, commandId, snapshot.revision, { ...command, notes: 'Changed' }), /outra operação/);
  assert.equal((await db.prepare('SELECT due FROM loans WHERE id=?').bind(loanId).first<{ due: string }>())!.due, dayOffset(3));
  const timestamp = await db.prepare("SELECT at FROM commands WHERE id=?").bind(commandId).first<{ at: string }>();
  assert.match(timestamp!.at, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  await assert.rejects(db.prepare('UPDATE loans SET due=? WHERE id=?').bind('2026-02-30', loanId).run(), /date|range/);
  await assert.rejects(execute({ kind: 'piece.save', piece: { name: 'Forbidden' } }, partner));
  await execute({ kind: 'portal.acknowledge', loanId }, partner);
  await execute({ kind: 'portal.return', loanId, reason: 'Return test request' }, partner);
  assert.equal(snapshot.state.pieces[0].available, 2, 'A return request cannot increase inventory');
  await execute({ kind: 'loan.settle', loanId, productId: pieceId, quantity: 1, action: 'return' });
  await execute({ kind: 'loan.settle', loanId, productId: pieceId, quantity: 1, action: 'sale' });
  const receivableId = snapshot.state.receivables[0].id;
  const paymentId = String((await execute({ kind: 'payment.record', receivableId, amount: 4000, reference: 'Payment fixture' })).result.id);
  assert.equal(balance(snapshot.state.receivables[0]), 6000);
  await execute({ kind: 'payment.reverse', paymentId, reason: 'Reversal test fixture' });
  assert.equal(balance(snapshot.state.receivables[0]), 10000);
  await assert.rejects(execute({ kind: 'payment.reverse', paymentId, reason: 'Duplicate reversal test' }));
  const otherLoanId = String((await execute({ ...command, merchantId: otherMerchantId, items: { [pieceId]: 1 } })).result.id);
  await assert.rejects(execute({ kind: 'portal.acknowledge', loanId: otherLoanId }, partner), /não encontrado/);
  const portal = portalSnapshot(await repo.read(partner));
  assert.deepEqual(portal.loans.map(l => l.id), [loanId]);
  assert.ok(portal.notices.every(n => n.merchantId === merchantId && n.audience === 'Lojista'));
  assert.equal('pieces' in portal, false);
  assert.equal('owner_id' in portal, false);
  assert.ok(portal.loans.every(l => l.events.every(e => !('actorId' in e))));

  // The failure follows workspace revision and command receipt writes in the same transaction.
  const beforeFailure = await repo.read(owner);
  const batch = db.batch.bind(db);
  db.batch = statements => batch(statements.length && 'sql' in statements[0] && String(statements[0].sql).startsWith('UPDATE workspaces')
    ? [...statements.slice(0, 2), db.prepare('UPDATE pieces SET available=-1 WHERE id=?').bind(pieceId), ...statements.slice(2)] : statements);
  const failureId = crypto.randomUUID();
  await assert.rejects(repo.execute(owner, failureId, beforeFailure.revision, { kind: 'stock.move', pieceId, action: 'receive', quantity: 1, reason: 'Rollback fixture' }), /check constraint/);
  db.batch = batch;
  assert.deepEqual(await repo.read(owner), beforeFailure);
  assert.equal(await db.prepare('SELECT id FROM commands WHERE id=?').bind(failureId).first(), null);

  await execute({ kind: 'stock.move', pieceId, action: 'count', quantity: 1, reason: 'Last unit fixture' });
  const raceRevision = snapshot.revision;
  const lastUnit = { ...command, items: { [pieceId]: 1 } };
  const race = await Promise.allSettled([repo.execute(owner, crypto.randomUUID(), raceRevision, lastUnit), repo.execute(owner, crypto.randomUUID(), raceRevision, lastUnit)]);
  assert.equal(race.filter(r => r.status === 'fulfilled').length, 1);
  const rejected = race.find(r => r.status === 'rejected');
  assert.ok(rejected?.status === 'rejected' && rejected.reason instanceof AppError && rejected.reason.status === 409);
  snapshot = await repo.read(owner); assert.equal(snapshot.state.pieces[0].available, 0);

  if (real) {
    const reader = await admin.connect();
    try {
      await reader.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const first = await reader.query('SELECT revision FROM workspaces');
      await execute({ kind: 'stock.move', pieceId, action: 'receive', quantity: 1, reason: 'Snapshot test' });
      assert.deepEqual((await reader.query('SELECT revision FROM workspaces')).rows, first.rows);
    } finally { await reader.query('ROLLBACK'); reader.release(); }
  }
  await execute({ kind: 'merchant.save', merchant: { ...snapshot.state.merchants.find(m => m.id === merchantId), portalEnabled: false } });
  await assert.rejects(repo.read(partner), /desabilitado/);
  await assert.rejects(repo.execute(partner, crypto.randomUUID(), snapshot.revision, { kind: 'portal.read' }), /desabilitado/);

  const sessionId = crypto.randomUUID();
  await admin.query('INSERT INTO auth.sessions (id,user_id,not_after) VALUES ($1,$2,$3)', [sessionId, ownerId, new Date(Date.now() + 60000).toISOString()]);
  await assertActiveSession(db, ownerId, sessionId);
  await assert.rejects(assertActiveSession(db, strangerId, sessionId), /encerrada/);
  await admin.query('UPDATE auth.sessions SET not_after=$1 WHERE id=$2', ['2000-01-01T00:00:00Z', sessionId]);
  await assert.rejects(assertActiveSession(db, ownerId, sessionId), /encerrada/);
  await admin.query('DELETE FROM auth.sessions WHERE id=$1', [sessionId]);
  await assert.rejects(assertActiveSession(db, ownerId, sessionId), /encerrada/);

  const sent: { key: string; body: string }[] = [];
  const transport: typeof fetch = async (url, options) => {
    if (String(url).includes('/domains')) return Response.json({ data: [{ id: 'test', name: 'example.com', status: 'verified' }], has_more: false });
    assert.equal(String(url), 'https://api.resend.com/emails');
    sent.push({ key: new Headers(options?.headers).get('Idempotency-Key')!, body: String(options?.body) });
    return Response.json({ id: crypto.randomUUID() });
  };
  const messaging = new Messaging(db, 'a'.repeat(64), transport);
  await messaging.configure(owner, { sender: 'mail@example.com', apiKey: 're_test_fixture_only_12345', revision: 0 });
  const delivery = (await messaging.snapshot(owner)).deliveries[0];
  await messaging.enqueue(owner, delivery.id);
  await Promise.all([messaging.process(), messaging.process()]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].key, 'elo/' + delivery.id);
  assert.ok(JSON.parse(sent[0].body).text.includes('https://elo.example'));
  const saved = (await messaging.snapshot(owner)).deliveries.find(d => d.id === delivery.id)!;
  assert.equal(saved.status, 'accepted'); assert.equal(saved.attempts, 1);
  assert.equal('encrypted_key' in (await messaging.snapshot(owner)).connection, false);
  console.log(`OK (${real ? 'PostgreSQL real, multiple connections' : 'PGlite, serialized connection'}): 14 tables, RLS/privileges, UUID/date handling, explicit owner identity, portal isolation/revocation, atomic rollback, last-unit dispute, idempotency, returns/sales/payments/reversal, session expiry/revocation, mocked Resend claim.`);
} finally { await fixture.close(); }
