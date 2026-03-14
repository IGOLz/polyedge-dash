import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query<T extends Record<string, unknown>>(
  text: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    await client.query("SET statement_timeout = '5000'");
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
