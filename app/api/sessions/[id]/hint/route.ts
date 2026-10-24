import { z } from "zod";
import { giveHint } from "@/lib/hints";
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

      const result = await giveHint({ req, session: s, question: q, partial: body.partialTranscript?.trim() ?? "", via: "typed" });
      if (!result.ok) {
        return json({ error: "Couldn't get a hint right now. Please try again.", retry: true }, 502);
      }
      return json({ hint: result.hint });
    },
    { sessionId: id },
  );
}
