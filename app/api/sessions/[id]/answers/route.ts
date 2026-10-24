import { z } from "zod";
import { query, tx } from "@/lib/db";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, isUuid, notFound, readJson } from "@/lib/http";
import { loadSession } from "@/lib/session";
import { wordCount } from "@/lib/signals";

const Body = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("text"),
    questionId: z.uuid(),
    transcript: z.string().trim().min(2, "Your answer is empty.").max(6000, "Please keep your answer under 6000 characters."),
    durationMs: z.number().int().min(0).max(60 * 60_000).optional(),
    pasteDetected: z.boolean().default(false),
  }),
  // A spoken answer names its voice take; the transcript comes from ElevenLabs, not the browser.
  z.object({ mode: z.literal("voice"), questionId: z.uuid(), voiceTakeId: z.uuid() }),
]);

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

      let answer: { transcript: string; durationMs: number | null; pasteDetected: boolean; voiceTakeId: string | null };
      if (body.mode === "voice") {
        const [voiceTake] = await query<{ transcript: string; duration_ms: number }>(
          "select transcript, duration_ms from voice_takes where id = $1 and session_id = $2 and question_id = $3",
          [body.voiceTakeId, id, q.id],
        );
        if (!voiceTake) throw new HttpError(400, "That recording wasn't found. Please record your answer again.");
        answer = { transcript: voiceTake.transcript, durationMs: voiceTake.duration_ms, pasteDetected: false, voiceTakeId: body.voiceTakeId };
      } else {
        answer = { transcript: body.transcript, durationMs: body.durationMs ?? null, pasteDetected: body.pasteDetected, voiceTakeId: null };
      }

      await tx(async (db) => {
        const [{ hints }] = (
          await db.query<{ hints: number }>(
            `select count(*)::int as hints from agent_runs
              where session_id = $1 and task = 'hint' and status = 'SUCCEEDED' and input->>'question_id' = $2`,
            [id, q.id],
          )
        ).rows;
        const inserted = await db.query(
          `insert into answers (session_id, question_id, input_mode, transcript, duration_ms, hints_used, paste_detected, voice_take_id)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           on conflict (session_id, question_id) where question_id is not null do nothing`,
          [id, q.id, body.mode, answer.transcript, answer.durationMs, hints, answer.pasteDetected, answer.voiceTakeId],
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
              word_count: wordCount(answer.transcript),
              duration_ms: answer.durationMs,
              hints_used: hints,
              paste_detected: answer.pasteDetected,
              voice_take_id: answer.voiceTakeId,
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
