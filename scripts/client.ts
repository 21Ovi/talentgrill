import pg from "pg";
import { pgSsl } from "../lib/pgTls.ts";

export async function connect(): Promise<pg.Client> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (put it in .env.local for local runs)");
  const client = new pg.Client({ connectionString: url, ssl: pgSsl(url) });
  await client.connect();
  return client;
}
