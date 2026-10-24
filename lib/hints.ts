import { runAgent } from "./agent/run";
import { HintOutput } from "./agent/schemas";
import { query } from "./db";
import { logEvent, requestMeta } from "./events";
import type { LoadedSession, SessionQuestion } from "./session";

/**
 * Asks FresherCoachAgent for a hint on one question and logs it. Shared by the
 * question-by-question flow and the live call's get_hint tool.
 */
export async function giveHint(opts: {
  req: Request;
  session: LoadedSession;
  question: SessionQuestion;
  partial: string;
  via: "typed" | "live";
}): Promise<{ ok: true; hint: string } | { ok: false }> {
  const { req, session: s, question: q, partial, via } = opts;
  await logEvent({
    actor: "user",
    type: "hint_requested",
    userId: s.userId,
    sessionId: s.id,
    payload: { question_id: q.id, partial_chars: partial.length, via, ...requestMeta(req) },
  });

  const previous = await query<{ hint: string }>(
    `select output->>'hint' as hint from agent_runs
      where session_id = $1 and task = 'hint' and status = 'SUCCEEDED' and input->>'question_id' = $2
      order by created_at`,
    [s.id, q.id],
  );

  const result = await runAgent({
    task: "hint",
    sessionId: s.id,
    userId: s.userId,
    schema: HintOutput,
    input: {
      question_id: q.id,
      role: s.roleLabel,
      kind: q.kind,
      question: q.question_text,
      key_points: q.rubric.key_points,
      partial_transcript: partial,
      previous_hints: previous.map((p) => p.hint),
    },
  });
  if (!result.ok) return { ok: false };

  await logEvent({
    actor: "agent",
    type: "hint_given",
    userId: s.userId,
    sessionId: s.id,
    payload: { question_id: q.id, agent_run_id: result.runId, hint: result.output.hint, via },
  });
  return { ok: true, hint: result.output.hint };
}
