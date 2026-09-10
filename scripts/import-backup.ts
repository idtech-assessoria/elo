import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { poolConfig } from '../server/postgres';
import { bootstrapOwner } from '../server/config';

const [file, option = '--dry-run', ...extra] = process.argv.slice(2);
assert.ok(file && ['--dry-run', '--apply'].includes(option) && !extra.length, 'Uso: npm run db:import -- /caminho/dados/estado-operacional.json [--dry-run|--apply]');
const contents = readFileSync(file);
assert.equal(createHash('sha256').update(contents).digest('hex'), '51d37ae8fa8c00b8cdc2ecb166848f23dbccbe2feca1c3fbe99930f2eccd79c1', 'Este importador aceita somente o backup original verificado de 10/09/2026.');
const backup = JSON.parse(contents.toString('utf8'));
assert.equal(backup.format, 'elo-operational-backup-v1');
assert.equal(backup.business_revision_stable, true);
for (const [name, data] of Object.entries(backup.tables)) assert.equal((data as { rows: unknown[] }).rows.length, name === 'workspaces' ? 1 : 0, 'O importador inicial não aceita movimentações operacionais.');
const source = backup.tables.workspaces.rows[0];
const identity = bootstrapOwner();
assert.ok(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(identity.id), 'Defina ELO_OWNER_USER_ID com o UUID real do Supabase Auth, nunca o identificador do Sites.');
assert.equal(identity.email, source.owner_email, 'O e-mail da proprietária deve corresponder ao backup.');
assert.ok(process.env.DATABASE_URL, 'Configure a conexão de importação autorizada em DATABASE_URL.');
const pool = new Pool(poolConfig(process.env.DATABASE_URL));
const client = await pool.connect();
try {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  await client.query('LOCK TABLE public.workspaces IN EXCLUSIVE MODE');
  const user = await client.query('SELECT id,email,email_confirmed_at,is_anonymous FROM auth.users WHERE id=$1', [identity.id]);
  assert.equal(user.rows.length, 1, 'A proprietária ainda não existe no Supabase Auth.');
  assert.equal(user.rows[0].email?.toLowerCase(), identity.email);
  assert.ok(user.rows[0].email_confirmed_at && !user.rows[0].is_anonymous, 'Confirme primeiro a titularidade do e-mail no Supabase Auth.');
  // Table names are constants; the backup cannot supply SQL identifiers.
  for (const name of ['workspaces', 'pieces', 'merchants', 'loans', 'loan_items', 'loan_events', 'receivables', 'payments', 'notices', 'movements', 'commands', 'email_outbox', 'messaging_connections', 'gmail_setups']) {
    assert.equal(Number((await client.query(`SELECT count(*) AS n FROM public.${name}`)).rows[0].n), 0, `Importação recusada: ${name} já contém dados. Nenhum registro será substituído.`);
  }
  if (option === '--apply') {
    await client.query('INSERT INTO workspaces (id,owner_id,owner_email,revision,last_command,settings,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [source.id, identity.id, source.owner_email, source.revision, source.last_command, source.settings, source.created_at]);
    await client.query('COMMIT');
    console.log('Assistência original importada e vinculada ao UUID verificado. Nenhuma peça, movimentação ou credencial foi criada. Nenhum e-mail foi enviado.');
  } else {
    await client.query('ROLLBACK');
    console.log('Conferência concluída. A importação preservará os dados e a data da assistência original, com o novo UUID verificado. Use --apply para executar.');
  }
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
