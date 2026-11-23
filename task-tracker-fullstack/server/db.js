// Database: Supabase Postgres. We connect with the "pg" package.
// Use the Transaction pooler address (port 6543) from Supabase, because Vercel starts many short-lived functions.
// The tables are made by supabase/schema.sql (run it once in the Supabase SQL Editor).
import pg from "pg";
import { config } from "./config.js";

// Let Postgres "integer" columns come back as JS numbers, and COUNT/SUM (bigint) too.
pg.types.setTypeParser(20, (value) => Number(value));

const local = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: local ? false : { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10000,
});

// Run one query. Returns the rows.
export async function all(sql, params = [], client = pool) {
  const result = await client.query(sql, params);
  return result.rows;
}

// Run one query. Returns the first row (or undefined).
export async function one(sql, params = [], client = pool) {
  return (await all(sql, params, client))[0];
}

// Run many queries together. If something fails, nothing is saved.
// The function receives a "client" to pass as the last argument of all() / one().
export async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
