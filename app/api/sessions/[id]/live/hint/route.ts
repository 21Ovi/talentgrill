import { z } from "zod";
import { query } from "@/lib/db";
import { giveHint } from "@/lib/hints";
import { handle, HttpError, isUuid, json, notFound, readJson } from "@/lib/http";
import { clientIp, take } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";

const Body = z.object({
  liveCallId: z.uuid(),
  number: z.number().int().min(1).max(20),
  saidSoFar: z.string().max(4000).optional(),
});

// The interviewer agent's get_hint tool, relayed by the browser mid-call.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/live/hint">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "live_hint",
    async () => {
      const body = await readJson(req, Body);
      if (!take(`hint:session:${id}`, 6, 1 / 30) || !take(`hint:ip:${clientIp(req)}`, 200, 3)) {
        throw new HttpError(429, "Too many hints in a row.");
      }
      const [call] = await query<{ status: string; questions: { number: number; question_id: string }[] }>(
        "select status, questions from live_calls where id = $1 and session_id = $2",
        [body.liveCallId, id],
      );
      if (!call || call.status !== "STARTED") throw new HttpError(409, "This call has ended.");
      const s = await loadSession(id);
      const questionId = call.questions.find((q) => q.number === body.number)?.question_id;
      const q = s?.questions.find((x) => x.id === questionId);
      if (!s || !q) throw new HttpError(404, "Question not found.");

      const result = await giveHint({ req, session: s, question: q, partial: body.saidSoFar?.trim() ?? "", via: "live" });
      if (!result.ok) return json({ error: "No hint available right now." }, 502);
      return json({ hint: result.hint });
    },
    { sessionId: id },
  );
}
