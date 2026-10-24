// Applies db/migrations/*.sql in filename order, each in its own transaction.
// Once real users exist, migrations must be additive only.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { connect } from "./client.ts";

const dir = path.join(import.meta.dirname, "..", "db", "migrations");

async function main() {
  const db = await connect();
  try {
    await db.query("select pg_advisory_lock(727001)");
    await db.query(
      "create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())",
    );
    const { rows } = await db.query<{ filename: string }>("select filename from schema_migrations");
    const applied = new Set(rows.map((r) => r.filename));
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await db.query("begin");
      try {
        await db.query(sql);
        await db.query("insert into schema_migrations (filename) values ($1)", [file]);
        await db.query("insert into events (actor, type, payload) values ('system', 'migration_applied', $1)", [
          { file },
        ]);
        await db.query("commit");
        console.log(`applied ${file}`);
      } catch (err) {
        await db.query("rollback");
        throw new Error(`${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log(`migrations up to date (${files.length} files)`);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
