import { Pool } from 'pg';
import { poolConfig } from '../server/postgres.ts';

// Read-only deployment gate: no users, operational fixtures, or email requests.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required before starting Elo');
if (!/^[0-9a-f]{64}$/i.test(process.env.MESSAGING_ENCRYPTION_KEY ?? '')) {
  throw new Error('MESSAGING_ENCRYPTION_KEY must contain 64 hexadecimal characters');
}
const pool = new Pool(poolConfig(databaseUrl));
try {
  const { rows: [role] } = await pool.query(`
    SELECT current_user AS name, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
    FROM pg_roles WHERE rolname = current_user
  `);
  if (role.name !== 'elo_app' || role.rolsuper || role.rolbypassrls || role.rolcreaterole || role.rolcreatedb) {
    throw new Error('The runtime must use the restricted elo_app role');
  }
  const { rows: [schema] } = await pool.query(`
    SELECT count(*)::int AS tables, bool_and(rowsecurity) AS rls
    FROM pg_tables WHERE schemaname = 'public'
  `);
  if (schema.tables !== 14 || !schema.rls) throw new Error('Elo migrations are incomplete');
  await pool.query('SELECT id FROM public.workspaces LIMIT 0');
  const { rows: [sessionCheck] } = await pool.query('SELECT elo_private.session_active(NULL::uuid,NULL::uuid) AS active');
  if (sessionCheck.active !== false) throw new Error('Invalid session verification function');
  console.log('Elo database ready: connection, restricted elo_app role, 14 tables with RLS, session permissions verified.');
} catch (error) {
  // Never print connection strings, passwords, or arbitrary provider messages.
  console.error('Elo database preflight failed:', String(error.code ?? 'CONFIGURATION_ERROR'));
  process.exitCode = 1;
} finally {
  await pool.end();
}
