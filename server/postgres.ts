import { Pool, types, type PoolClient, type PoolConfig } from 'pg';
import type { SqlDatabase, SqlResult, SqlStatement } from './database';

/** Convert positional bindings without rewriting quoted SQL or comments. */
export function postgresSql(sql: string, values: number): string {
  let result = '';
  let parameter = 0;
  for (let i = 0; i < sql.length;) {
    const c = sql[i];
    if (c === "'" || c === '"') {
      const start = i++;
      while (i < sql.length) {
        if (sql[i++] === c) {
          if (sql[i] === c) { i++; continue; }
          break;
        }
      }
      result += sql.slice(start, i);
    } else if (sql.startsWith('--', i)) {
      const end = sql.indexOf('\n', i);
      const next = end < 0 ? sql.length : end;
      result += sql.slice(i, next); i = next;
    } else if (sql.startsWith('/*', i)) {
      const start = i; i += 2; let depth = 1;
      while (i < sql.length && depth) {
        if (sql.startsWith('/*', i)) { depth++; i += 2; }
        else if (sql.startsWith('*/', i)) { depth--; i += 2; }
        else i++;
      }
      result += sql.slice(start, i);
    } else if (c === '$' && /^\$(?:[a-zA-Z_][a-zA-Z_0-9]*)?\$/.test(sql.slice(i))) {
      const delimiter = sql.slice(i).match(/^\$(?:[a-zA-Z_][a-zA-Z_0-9]*)?\$/)![0];
      const end = sql.indexOf(delimiter, i + delimiter.length);
      if (end < 0) throw new Error('Unterminated SQL literal');
      result += sql.slice(i, end + delimiter.length); i = end + delimiter.length;
    } else if (c === '?') {
      result += `$${++parameter}`; i++;
    } else { result += c; i++; }
  }
  if (parameter !== values) throw new Error('SQL binding count mismatch');
  return result;
}

export function poolConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // URL SSL parameters must not override certificate verification.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl', 'uselibpqcompat']) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true, ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA } : {}) },
    max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000, idle_in_transaction_session_timeout: 30_000,
    application_name: 'elo',
    types: { getTypeParser(oid, format) {
      if (format !== 'binary' && oid === 1082) return (value: string) => value;
      if (format !== 'binary' && oid === 1184) return (value: string) => new Date(value).toISOString();
      return types.getTypeParser(oid, format);
    } },
  };
}

class PostgresStatement implements SqlStatement {
  constructor(readonly database: PostgresDatabase, readonly sql: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]) { return new PostgresStatement(this.database, this.sql, values); }
  async query(client: Pool | PoolClient) {
    if (this.values.some(value => value === undefined)) throw new Error('Undefined SQL binding');
    const r = await client.query(postgresSql(this.sql, this.values.length), this.values);
    return { success: true, results: r.rows, meta: { changes: r.rowCount ?? 0 } };
  }
  async all<T = Record<string, unknown>>(): Promise<SqlResult<T>> { return this.query(this.database.pool); }
  async first<T = Record<string, unknown>>(): Promise<T | null> { return (await this.all<T>()).results[0] ?? null; }
  async run(): Promise<SqlResult> { return this.query(this.database.pool); }
}

export class PostgresDatabase implements SqlDatabase {
  constructor(readonly pool: Pool) {}
  prepare(sql: string): SqlStatement { return new PostgresStatement(this, sql); }
  async batch(statements: SqlStatement[]): Promise<SqlResult[]> {
    if (!statements.length) return [];
    const client = await this.pool.connect();
    let released = false;
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const results: SqlResult[] = [];
      for (const statement of statements) {
        if (!(statement instanceof PostgresStatement) || statement.database !== this) throw new Error('Statement belongs to another database');
        results.push(await statement.query(client));
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { client.release(true); released = true; throw error; }
      throw error;
    } finally { if (!released) client.release(); }
  }
}

const globalDatabase = globalThis as typeof globalThis & { eloPostgres?: PostgresDatabase };
export function getDatabase(): PostgresDatabase {
  if (!globalDatabase.eloPostgres) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const pool = new Pool(poolConfig(process.env.DATABASE_URL));
    pool.on('error', () => console.error('Elo database connection interrupted'));
    globalDatabase.eloPostgres = new PostgresDatabase(pool);
  }
  return globalDatabase.eloPostgres;
}
