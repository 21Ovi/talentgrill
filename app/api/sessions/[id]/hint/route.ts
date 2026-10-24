import { z } from "zod";
import { runAgent } from "@/lib/agent/run";
import { HintOutput } from "@/lib/agent/schemas";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, isUuid, notFound, readJson } from "@/lib/http";
import { clientIp, take } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";

const Body = z.object({
  questionId: z.uuid(),
  partialTranscript: z.string().max(6000).optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/hint">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "hint",
    async () => {
      const body = await readJson(req, Body);
      if (!take(`hint:session:${id}`, 6, 1 / 30) || !take(`hint:ip:${clientIp(req)}`, 200, 3)) {
        throw new HttpError(429, "That's a lot of hints. Give it a try on your own for a moment, then ask again.");
      }
      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      const q = s.current;
      if (q?.id !== body.questionId) throw new HttpError(409, "That question isn't open any more. Refresh to continue.");

      const partial = body.partialTranscript?.trim() ?? "";
      await logEvent({
        actor: "user",
        type: "hint_requested",
        userId: s.userId,
        sessionId: id,
        payload: { question_id: q.id, partial_chars: partial.length, ...requestMeta(req) },
      });

      const result = await runAgent({
        task: "hint",
        sessionId: id,
        userId: s.userId,
        schema: HintOutput,
        input: {
          question_id: q.id,
          role: s.roleLabel,
          kind: q.kind,
          question: q.question_text,
          key_points: q.rubric.key_points,
          partial_transcript: partial,
          previous_hints: s.currentHints,
        },
      });
      if (!result.ok) {
        return json({ error: "Couldn't get a hint right now. Please try again.", retry: true }, 502);
      }

      await logEvent({
        actor: "agent",
        type: "hint_given",
        userId: s.userId,
        sessionId: id,
        payload: { question_id: q.id, agent_run_id: result.runId, hint: result.output.hint },
      });
      return json({ hint: result.output.hint });
    },
    { sessionId: id },
  );
}
