import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { PostgresDatabase, poolConfig } from '../server/postgres';

const authFixture = `
  DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  CREATE SCHEMA auth;
  CREATE TABLE auth.sessions (id uuid PRIMARY KEY, user_id uuid NOT NULL, not_after timestamptz, private_fixture text);
`;

export async function postgresFixture() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (process.env.CI && !connectionString) throw new Error('CI requires a real PostgreSQL service');
  const files = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort();
  const migration = files.map(f => readFileSync('supabase/migrations/' + f, 'utf8')).join('\n');
  if (connectionString) {
    const url = new URL(connectionString);
    // A deliberately narrow test target; never run fixtures against Supabase or real data.
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
    assert.equal(url.pathname, '/elo_test');
    const admin = new Pool(poolConfig(connectionString));
    const existing = await admin.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname IN ('public','auth')");
    assert.equal(existing.rows[0].n, 0, 'Test database must be empty; no automatic deletion');
    await admin.query(authFixture + migration);
    const pool = new Pool({ ...poolConfig(connectionString), options: '-c role=elo_backend' });
    const db = new PostgresDatabase(pool);
    assert.equal((await pool.query('SELECT current_user AS name')).rows[0].name, 'elo_backend');
    return { db, admin, real: true, close: async () => { await pool.end(); await admin.end(); } };
  }

  const engine = new PGlite({ parsers: { 1082: value => value, 1184: value => new Date(value).toISOString() } });
  await engine.exec(authFixture + migration);
  // PGlite has one connection. This shim exercises the production SQL adapter,
  // with exclusive transactions; multi-connection behavior is tested only in CI.
  let pending = Promise.resolve();
  async function acquire() {
    const previous = pending;
    let release!: () => void;
    pending = new Promise<void>(resolve => { release = resolve; });
    await previous;
    return release;
  }
  async function query(sql: string, values: unknown[] = []) {
    const result = await engine.query(sql, values);
    return { rows: result.rows as Record<string, unknown>[], rowCount: result.affectedRows ?? result.rows.length };
  }
  const admin = {
    async query(sql: string, values: unknown[] = []) {
      const release = await acquire();
      try { return await query(sql, values); } finally { release(); }
    },
    async connect() { const release = await acquire(); return { query, release }; },
  };
  return { db: new PostgresDatabase(admin as unknown as Pool), admin, real: false, close: () => engine.close() };
}
