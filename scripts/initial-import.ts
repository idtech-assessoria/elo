import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';
import ownership from '../config/owner-migration.json';

const workspaceSchema = z.object({
  id: z.literal('primary'),
  owner_id: z.string().min(1),
  owner_email: z.string().email(),
  revision: z.literal(0),
  last_command: z.literal(''),
  settings: z.string(),
  created_at: z.string().datetime(),
}).strict();

export type InitialWorkspace = z.infer<typeof workspaceSchema>;
type OwnerIdentity = { id: string; email: string };
const tables = ['workspaces', 'pieces', 'merchants', 'loans', 'loan_items', 'loan_events', 'receivables', 'payments', 'notices', 'movements', 'commands', 'email_outbox', 'messaging_connections', 'gmail_setups'];

export function readVerifiedBackup(contents: Buffer): InitialWorkspace {
  assert.equal(createHash('sha256').update(contents).digest('hex'), '51d37ae8fa8c00b8cdc2ecb166848f23dbccbe2feca1c3fbe99930f2eccd79c1', 'Este importador aceita somente o backup original verificado de 10/09/2026.');
  const backup = JSON.parse(contents.toString('utf8'));
  assert.equal(backup.format, 'elo-operational-backup-v1');
  assert.equal(backup.business_revision_stable, true);
  for (const [name, data] of Object.entries(backup.tables)) {
    assert.equal((data as { rows: unknown[] }).rows.length, name === 'workspaces' ? 1 : 0, 'O importador inicial não aceita movimentações operacionais.');
  }
  return workspaceSchema.parse(backup.tables.workspaces.rows[0]);
}

export async function importInitialWorkspace(pool: Pool, source: InitialWorkspace, identity: OwnerIdentity, apply: boolean) {
  workspaceSchema.parse(source);
  assert.ok(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(identity.id), 'Defina ELO_OWNER_USER_ID com o UUID real do Supabase Auth, nunca o identificador do Sites.');
  assert.equal(source.owner_email.toLowerCase(), ownership.sourceEmail, 'A origem não corresponde ao vínculo autorizado.');
  assert.equal(identity.email, ownership.destinationEmail, 'O destino deve ser o e-mail autorizado em config/owner-migration.json.');
  const settings = z.object({ email: z.string().email() }).passthrough().parse(JSON.parse(source.settings));
  // The backup's contact address follows its old owner; separately configured contacts are preserved.
  const updatedSettings = settings.email.toLowerCase() === ownership.sourceEmail
    ? JSON.stringify({ ...settings, email: identity.email }) : source.settings;
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    // Constants only. Lock every destination table so the empty-database check remains valid until commit.
    await client.query(`LOCK TABLE ${tables.map(name => 'public.' + name).join(', ')} IN EXCLUSIVE MODE`);
    const user = await client.query('SELECT id,email,email_confirmed_at,is_anonymous FROM auth.users WHERE id=$1 FOR SHARE', [identity.id]);
    assert.equal(user.rows.length, 1, 'A proprietária ainda não existe no Supabase Auth.');
    assert.equal(user.rows[0].email?.toLowerCase(), identity.email, 'O UUID não corresponde ao e-mail autorizado.');
    assert.ok(user.rows[0].email_confirmed_at && !user.rows[0].is_anonymous, 'Confirme primeiro a titularidade do e-mail no Supabase Auth.');
    for (const name of tables) {
      assert.equal(Number((await client.query(`SELECT count(*) AS n FROM public.${name}`)).rows[0].n), 0, `Importação recusada: ${name} já contém dados. Nenhum registro será substituído.`);
    }
    // Execute the same insert for the dry run, then roll it back. This also validates database constraints.
    await client.query('INSERT INTO public.workspaces (id,owner_id,owner_email,revision,last_command,settings,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [source.id, identity.id, identity.email, source.revision, source.last_command, updatedSettings, source.created_at]);
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
