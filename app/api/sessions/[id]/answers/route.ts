import { z } from "zod";
import { tx } from "@/lib/db";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, isUuid, notFound, readJson } from "@/lib/http";
import { loadSession } from "@/lib/session";
import { wordCount } from "@/lib/signals";

const Body = z.object({
  questionId: z.uuid(),
  mode: z.enum(["voice", "text"]),
  transcript: z.string().trim().min(2, "Your answer is empty.").max(6000, "Please keep your answer under 6000 characters."),
  durationMs: z.number().int().min(0).max(60 * 60_000).optional(),
  pasteDetected: z.boolean().default(false),
});

export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/answers">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "answer",
    async () => {
      const body = await readJson(req, Body);
      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      if (s.current?.id !== body.questionId) {
        throw new HttpError(409, "That question isn't open any more. Refresh to continue.");
      }
      const q = s.current;

      await tx(async (db) => {
        const [{ hints }] = (
          await db.query<{ hints: number }>(
            `select count(*)::int as hints from agent_runs
              where session_id = $1 and task = 'hint' and status = 'SUCCEEDED' and input->>'question_id' = $2`,
            [id, q.id],
          )
        ).rows;
        const inserted = await db.query(
          `insert into answers (session_id, question_id, input_mode, transcript, duration_ms, hints_used, paste_detected)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (session_id, question_id) where question_id is not null do nothing`,
          [id, q.id, body.mode, body.transcript, body.durationMs ?? null, hints, body.pasteDetected],
        );
        if (inserted.rowCount === 0) return; // double submit: already saved

        if (q.tier === "pro") {
          await db.query("update sessions set status = 'PRO_IN_PROGRESS' where id = $1 and status = 'FREE_DONE'", [id]);
        }
        await logEvent(
          {
            actor: "user",
            type: "answer_submitted",
            userId: s.userId,
            sessionId: id,
            payload: {
              question_id: q.id,
              tier: q.tier,
              mode: body.mode,
              word_count: wordCount(body.transcript),
              duration_ms: body.durationMs ?? null,
              hints_used: hints,
              paste_detected: body.pasteDetected,
              ...requestMeta(req),
            },
          },
          db,
        );
      });

      const after = await loadSession(id);
      return json({ next: after?.next ?? "answer" });
    },
    { sessionId: id },
  );
}
