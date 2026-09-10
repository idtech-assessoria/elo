import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { importInitialWorkspace, readVerifiedBackup, type InitialWorkspace } from '../scripts/initial-import';
import { Repository } from '../server/repository';
import type { SqlDatabase } from '../server/database';

// Synthetic data exists only inside the isolated PostgreSQL fixture.
export async function checkInitialImport(admin: Pool, db: SqlDatabase) {
  const identity = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'idtech.assessoria@gmail.com' };
  const source: InitialWorkspace = {
    id: 'primary', owner_id: 'legacy-sites-identity', owner_email: 'lopesleticia297@gmail.com',
    revision: 0, last_command: '', created_at: '2026-09-10T03:12:08.759Z',
    settings: JSON.stringify({ name: 'Import fixture', email: 'lopesleticia297@gmail.com', hour: '09:00', before: true }),
  };
  assert.throws(() => readVerifiedBackup(Buffer.from('{}')), /somente o backup original/);
  await assert.rejects(importInitialWorkspace(admin, source, { ...identity, id: source.owner_id }, true), /UUID real/);
  await assert.rejects(importInitialWorkspace(admin, source, { ...identity, email: source.owner_email }, true), /e-mail autorizado/);
  await assert.rejects(importInitialWorkspace(admin, source, identity, true), /não existe no Supabase Auth/);
  await admin.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [identity.id, identity.email]);
  await assert.rejects(importInitialWorkspace(admin, source, identity, true), /titularidade/);
  await admin.query('UPDATE auth.users SET email_confirmed_at=$1,is_anonymous=true WHERE id=$2', [source.created_at, identity.id]);
  await assert.rejects(importInitialWorkspace(admin, source, identity, true), /titularidade/);
  await admin.query('UPDATE auth.users SET is_anonymous=false,email=$1 WHERE id=$2', ['stranger@example.com', identity.id]);
  await assert.rejects(importInitialWorkspace(admin, source, identity, true), /UUID não corresponde/);
  await admin.query('UPDATE auth.users SET email=$1 WHERE id=$2', [identity.email, identity.id]);
  await importInitialWorkspace(admin, source, identity, false);
  assert.equal((await admin.query('SELECT * FROM workspaces')).rows.length, 0, 'A dry run must roll back its insert');

  const race = await Promise.allSettled([
    importInitialWorkspace(admin, source, identity, true),
    importInitialWorkspace(admin, source, identity, true),
  ]);
  assert.equal(race.filter(result => result.status === 'fulfilled').length, 1, 'Only one concurrent import can succeed');
  const saved = (await admin.query('SELECT * FROM workspaces')).rows;
  assert.equal(saved.length, 1);
  assert.deepEqual({ ...saved[0], settings: JSON.parse(saved[0].settings) }, { ...source, owner_id: identity.id, owner_email: identity.email, settings: { ...JSON.parse(source.settings), email: identity.email } });
  assert.equal(JSON.parse(source.settings).email, source.owner_email, 'Do not mutate the source backup');
  await assert.rejects(importInitialWorkspace(admin, source, identity, true), /já contém dados/);
  assert.deepEqual((await admin.query('SELECT * FROM workspaces')).rows, saved);

  const repository = new Repository(db, identity);
  assert.equal((await repository.actor({ userId: identity.id, email: identity.email, displayName: 'Owner fixture' })).role, 'owner');
  const otherId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await assert.rejects(repository.actor({ userId: otherId, email: source.owner_email, displayName: 'Old account fixture' }));
  await assert.rejects(repository.actor({ userId: otherId, email: identity.email, displayName: 'Email without matching UUID' }));
  await admin.query('DELETE FROM workspaces WHERE id=$1 AND owner_id=$2', ['primary', identity.id]);
  // Preserve a contact that was independently configured instead of following the old owner.
  const separateContact = { ...source, settings: JSON.stringify({ ...JSON.parse(source.settings), email: 'contact@example.com' }) };
  await importInitialWorkspace(admin, separateContact, identity, true);
  assert.equal(JSON.parse((await admin.query('SELECT settings FROM workspaces')).rows[0].settings).email, 'contact@example.com');
  await admin.query('DELETE FROM workspaces WHERE id=$1 AND owner_id=$2', ['primary', identity.id]);
  await admin.query('DELETE FROM auth.users WHERE id=$1', [identity.id]);
  console.log('OK: verified owner remapping, unconfirmed/anonymous/wrong identity refusal, dry-run rollback, concurrent import, original settings/date, repeat refusal and old email access denial.');
}
