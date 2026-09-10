import { Pool } from 'pg';

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    // Small max: serverless functions are short-lived, each instance
    // needs only a couple of connections, not a big pool.
    pool = new Pool({ connectionString, max: 3 });
  }
  return pool;
}
