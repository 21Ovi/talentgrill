import type { z } from "zod";
import { query } from "../db";
import { logEvent } from "../events";
import { agentClient, type AgentClient } from "../integrations/agenticorg";
import { recordError, recordSuccess } from "../integrations/status";
import type { AgentTask } from "./schemas";

// Courses are long documents; everything else is a short reply.
const TIMEOUT_MS: Partial<Record<AgentTask, number>> = { course_plan: 90_000 };
const DEFAULT_TIMEOUT_MS = 45_000;

export type AgentResult<T> = { ok: true; output: T; runId: string } | { ok: false; error: string; runId: string | null };

/**
 * Runs one agent task end to end: records the run, calls AgenticOrg, validates
 * the JSON (retrying once with the validation error), and logs the outcome.
 * There is deliberately no fallback: if the agent is off, the task fails.
 */
export async function runAgent<T>(opts: {
  task: AgentTask;
  sessionId: string;
  userId: string;
  input: Record<string, unknown>;
  /** What to record in agent_runs instead of the input, e.g. without a resume's text. */
  storedInput?: Record<string, unknown>;
  schema: z.ZodType<T>;
}): Promise<AgentResult<T>> {
  const { task, sessionId, userId, input, storedInput, schema } = opts;
  const started = Date.now();

  let client: AgentClient;
  try {
    client = agentClient();
  } catch (err) {
    recordError("agenticorg", err);
    await logEvent({ actor: "system", type: "agent_run_failed", userId, sessionId, payload: { task, error: String(err) } });
    return { ok: false, error: String(err), runId: null };
  }

  const [run] = await query<{ id: string }>(
    "insert into agent_runs (session_id, task, mode, input) values ($1, $2, $3, $4) returning id",
    [sessionId, task, client.mode, storedInput ?? input],
  );
  await logEvent({
    actor: "system",
    type: "agent_run_started",
    userId,
    sessionId,
    payload: { task, agent_run_id: run.id, mode: client.mode },
  });

  let vendorRunId: string | null = null;
  let vendor: { confidence?: number | null; held_for_approval?: string | null } = {};
  let error = "";
  let output: T | null = null;
  const signal = AbortSignal.timeout(TIMEOUT_MS[task] ?? DEFAULT_TIMEOUT_MS);
  for (let attempt = 1; attempt <= 2 && output === null; attempt++) {
    try {
      const res = await client.run({ task, input, previousError: error || undefined, signal });
      vendorRunId = res.runId ?? vendorRunId;
      vendor = { confidence: res.confidence, held_for_approval: res.heldForApproval };
      const parsed = schema.safeParse(typeof res.output === "string" ? JSON.parse(res.output) : res.output);
      if (parsed.success) output = parsed.data;
      else error = parsed.error.issues.map((i) => `${i.path.join(".") || "output"}: ${i.message}`).join("; ");
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      if (signal.aborted || !(err instanceof SyntaxError)) break; // only bad JSON is worth a retry
    }
  }

  const latency = Date.now() - started;
  const ok = output !== null;
  await query(
    `update agent_runs set status = $2, output = $3, error = $4, latency_ms = $5,
            agenticorg_run_id = $6, finished_at = now() where id = $1`,
    [run.id, ok ? "SUCCEEDED" : "FAILED", ok ? JSON.stringify(output) : null, ok ? null : error, latency, vendorRunId],
  );
  await logEvent({
    actor: ok ? "agent" : "system",
    type: ok ? "agent_run_succeeded" : "agent_run_failed",
    userId,
    sessionId,
    payload: {
      task,
      agent_run_id: run.id,
      agenticorg_run_id: vendorRunId,
      mode: client.mode,
      latency_ms: latency,
      ...vendor,
      ...(ok ? {} : { error }),
    },
  });

  if (output !== null) {
    recordSuccess("agenticorg");
    return { ok: true, output, runId: run.id };
  }
  recordError("agenticorg", error);
  return { ok: false, error, runId: run.id };
}
