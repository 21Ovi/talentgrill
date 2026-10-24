import { interviewVariables } from "@/lib/agent/interviewer";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { logError, logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound } from "@/lib/http";
import { conversationToken, interviewerAgentId } from "@/lib/integrations/elevenlabsAgent";
import { clientIp, take } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";

// Starts a live voice interview: the remaining free questions, asked by the
// ElevenLabs interviewer agent. Returns a short-lived token for the browser.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/live/start">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "live_start",
    async () => {
      if (!env().LIVE_INTERVIEW_ENABLED) throw new HttpError(503, "Live interviews are off right now. You can answer by typing.");
      // Calls cost voice minutes: a few per session, a loose ceiling per venue IP.
      if (!take(`live:session:${id}`, 3, 1 / 120) || !take(`live:ip:${clientIp(req)}`, 60, 1)) {
        throw new HttpError(429, "Too many attempts. Please wait a minute and try again.");
      }
      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      if (s.next !== "answer" || s.current?.tier !== "free") {
        throw new HttpError(409, "There are no free questions left to answer in this session.");
      }

      const questions = s.questions
        .filter((q) => q.tier === "free" && !q.answered)
        .map((q, i) => ({ number: i + 1, question_id: q.id, text: q.question_text }));

      let agentId: string;
      let token: string;
      try {
        agentId = await interviewerAgentId();
        token = await conversationToken(agentId, s.firstName);
      } catch (err) {
        await logError("live_start", err, { sessionId: id, userId: s.userId });
        throw new HttpError(503, "The live interviewer is unavailable right now. You can answer by typing instead.");
      }

      const [call] = await query<{ id: string }>(
        "insert into live_calls (session_id, agent_id, questions) values ($1, $2, $3) returning id",
        [id, agentId, JSON.stringify(questions.map(({ number, question_id }) => ({ number, question_id })))],
      );
      await logEvent({
        actor: "user",
        type: "live_interview_started",
        userId: s.userId,
        sessionId: id,
        payload: { live_call_id: call.id, agent_id: agentId, questions: questions.length, ...requestMeta(req) },
      });

      return json({
        liveCallId: call.id,
        token,
        questionCount: questions.length,
        dynamicVariables: interviewVariables({
          sessionId: id,
          firstName: s.firstName,
          roleLabel: s.roleLabel,
          questions: questions.map(({ number, text }) => ({ number, text })),
        }),
      });
    },
    { sessionId: id },
  );
}
