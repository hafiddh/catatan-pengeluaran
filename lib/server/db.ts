import { Pool, types } from 'pg';

// OID 1082 = Postgres `date`. pg's default parser turns it into a JS Date
// at local-timezone midnight, so a later .toISOString() shifts the date
// backward whenever the server runs east of UTC (e.g. Asia/Jakarta,
// UTC+7). Keep it as the raw 'YYYY-MM-DD' string instead.
types.setTypeParser(1082, (value) => value);

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
