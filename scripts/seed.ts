// Idempotent upsert of the question bank: the only seed data allowed.
import { QUESTIONS } from "../db/seed/questions.ts";
import { connect } from "./client.ts";

async function main() {
  const db = await connect();
  try {
    await db.query("begin");
    let changed = 0;
    for (const q of QUESTIONS) {
      const res = await db.query(
        `insert into questions (domain, role, kind, tier, position, question_text, rubric)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (role, tier, position) where session_id is null do update
           set domain = excluded.domain, kind = excluded.kind,
               question_text = excluded.question_text, rubric = excluded.rubric
         where (questions.domain, questions.kind, questions.question_text, questions.rubric)
               is distinct from (excluded.domain, excluded.kind, excluded.question_text, excluded.rubric)`,
        [q.domain, q.role, q.kind, q.tier, q.position, q.question_text, JSON.stringify(q.rubric)],
      );
      changed += res.rowCount ?? 0;
    }
    if (changed > 0) {
      await db.query("insert into events (actor, type, payload) values ('system', 'questions_seeded', $1)", [
        { changed, total: QUESTIONS.length },
      ]);
    }
    await db.query("commit");
    console.log(`questions: ${changed} inserted or updated, ${QUESTIONS.length} in bank`);
  } catch (err) {
    await db.query("rollback");
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
