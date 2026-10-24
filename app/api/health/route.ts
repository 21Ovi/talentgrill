import { pool } from "@/lib/db";
import { integrationReport } from "@/lib/integrations/status";

type DbHealth =
  | { ok: true; latency_ms: number; migrations: number; questions: number }
  | { ok: false; error: string };

// Must answer even when the DB or env is broken: failures are reported, never thrown.
export async function GET() {
  const started = Date.now();
  let db: DbHealth;
  try {
    const { rows } = await pool().query<{ migrations: number; questions: number }>(
      `select (select count(*) from schema_migrations)::int as migrations,
              (select count(*) from questions where session_id is null)::int as questions`,
    );
    db = { ok: true, latency_ms: Date.now() - started, ...rows[0] };
  } catch (err) {
    db = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return Response.json(
    {
      ok: db.ok,
      db,
      integrations: integrationReport(),
      commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
      time: new Date().toISOString(),
    },
    { status: db.ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
