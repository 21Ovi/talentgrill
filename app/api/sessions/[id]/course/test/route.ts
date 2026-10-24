import { z } from "zod";
import { PASS_PERCENT } from "@/lib/course";
import { query } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound, readJson } from "@/lib/http";
import { clientIp, take } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";

const Body = z.object({ answers: z.array(z.number().int().min(-1).max(3)).min(1).max(8) });

// Grades the course's final test on the server and keeps the best score.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/course/test">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "course_test",
    async () => {
      const { answers } = await readJson(req, Body);
      if (!take(`test:session:${id}`, 10, 1 / 30) || !take(`test:ip:${clientIp(req)}`, 200, 3)) {
        throw new HttpError(429, "Too many attempts. Please wait a moment.");
      }
      const s = await loadSession(id);
      const test = s?.course?.final_test;
      if (!s?.course || !test) throw new HttpError(404, "This course has no final test.");
      if (answers.length !== test.length) throw new HttpError(400, "Answer every question first.");

      const results = test.map((q, i) => ({ correct: answers[i] === q.answer, answer: q.answer, explain: q.explain }));
      const correct = results.filter((r) => r.correct).length;
      const score = Math.round((correct / test.length) * 100);
      const passed = score >= PASS_PERCENT;
      const [row] = await query<{ test_score: number }>(
        `update courses set test_score = greatest(coalesce(test_score, 0), $2), test_taken_at = now()
          where session_id = $1 returning test_score`,
        [id, score],
      );
      await logEvent({
        actor: "user",
        type: "course_test_taken",
        userId: s.userId,
        sessionId: id,
        payload: { score, correct, total: test.length, passed, best: row.test_score },
      });
      return json({ score, best: row.test_score, correct, total: test.length, passed, results });
    },
    { sessionId: id },
  );
}
