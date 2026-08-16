import { Pool } from 'pg';

export function createDatabasePool(options: {
  connectionString: string;
  schema: string;
  max?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  statementTimeout?: number;
}) {
  if (!/^[a-z_][a-z0-9_]*$/.test(options.schema)) throw new Error('Invalid database schema');
  return new Pool({
    connectionString: options.connectionString,
    options: `-c search_path=${options.schema},public -c statement_timeout=${options.statementTimeout ?? 30000} -c application_name=erp-api`,
    max: options.max ?? 10,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5000,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30000,
  });
}
