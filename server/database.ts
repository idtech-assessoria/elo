export type SqlResult<T = Record<string, unknown>> = {
  success: boolean;
  results: T[];
  meta: { changes?: number };
};

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<SqlResult<T>>;
  run(): Promise<SqlResult>;
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  /** All statements share one transaction and one consistent snapshot. */
  batch(statements: SqlStatement[]): Promise<SqlResult[]>;
}
