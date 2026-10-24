import pg from "pg";
import { env } from "./env";
import { pgSsl } from "./pgTls";

/** A pool or a transaction client: anything that can run a query. */
export type Queryable = Pick<pg.Pool, "query">;

const g = globalThis as unknown as { __pgPool?: pg.Pool };

export function pool(): pg.Pool {
  if (g.__pgPool) return g.__pgPool;
  const url = env().DATABASE_URL;
  const p = new pg.Pool({
    connectionString: url,
    ssl: pgSsl(url),
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 15_000,
  });
  // An idle client error is emitted on the pool; unhandled, it would crash the process.
  p.on("error", (err) => console.error("[db] idle client error", err.message));
  g.__pgPool = p;
  return p;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await pool().query<T>(text, params)).rows;
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
