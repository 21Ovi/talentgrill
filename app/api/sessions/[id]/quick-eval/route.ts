import { runAgent } from "@/lib/agent/run";
import { QuickEvalOutput } from "@/lib/agent/schemas";
import { query } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { handle, HttpError, json, isUuid, notFound } from "@/lib/http";
import { RESUME_CONTEXT_NOTE, resumeBrief } from "@/lib/resume";
import { loadSession } from "@/lib/session";
import { computeSignals } from "@/lib/signals";

// Double taps or a remounting page share one agent run per session.
const inFlight = new Map<string, Promise<Response>>();

export async function POST(_req: Request, ctx: RouteContext<"/api/sessions/[id]/quick-eval">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const pending = inFlight.get(id);
  if (pending) return (await pending).clone();

  const work = handle("quick_eval", () => quickEval(id), { sessionId: id });
  inFlight.set(id, work);
  try {
    return (await work).clone();
  } finally {
    inFlight.delete(id);
  }
}

async function quickEval(id: string): Promise<Response> {
  const s = await loadSession(id);
  if (!s) throw new HttpError(404, "Session not found.");
  if (s.quickFeedback) return json({ quickFeedback: s.quickFeedback });
  if (s.next !== "quick_eval") throw new HttpError(409, "Answer both free questions first.");

  const answers = await query<{
    question_text: string;
    kind: string;
    transcript: string;
    input_mode: "voice" | "text";
    duration_ms: number | null;
    hints_used: number;
    paste_detected: boolean;
  }>(
    `select q.question_text, q.kind, a.transcript, a.input_mode, a.duration_ms, a.hints_used, a.paste_detected
       from answers a join questions q on q.id = a.question_id
      where a.session_id = $1 and q.tier = 'free'
      order by q.position`,
    [id],
  );

  const result = await runAgent({
    task: "quick_eval",
    sessionId: id,
    userId: s.userId,
    schema: QuickEvalOutput,
    input: {
      role: s.roleLabel,
      ...(s.resume ? { resume: resumeBrief(s.resume), resume_note: RESUME_CONTEXT_NOTE } : {}),
      answers: answers.map((a) => ({
        question: a.question_text,
        kind: a.kind,
        transcript: a.transcript,
        input_mode: a.input_mode,
        hints_used: a.hints_used,
        paste_detected: a.paste_detected,
        signals: computeSignals(a.transcript, a.input_mode, a.duration_ms),
      })),
    },
  });
  if (!result.ok) {
    return json({ error: "Couldn't prepare your feedback. Please try again.", retry: true }, 502);
  }

  await query(
    `update sessions set quick_feedback = $2,
            status = case when status = 'IN_PROGRESS' then 'FREE_DONE' else status end
      where id = $1`,
    [id, JSON.stringify(result.output)],
  );
  await logEvent({
    actor: "agent",
    type: "quick_feedback_given",
    userId: s.userId,
    sessionId: id,
    payload: { agent_run_id: result.runId, overall_estimate: result.output.overall_estimate },
  });
  return json({ quickFeedback: result.output });
}
