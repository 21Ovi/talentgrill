import { z } from "zod";
import type { AgentTask } from "../agent/schemas";
import { env } from "../env";
import { integrationMode } from "./status";

export type AgentRequest = {
  task: AgentTask;
  input: Record<string, unknown>;
  /** Validation error from the previous attempt, for the single retry. */
  previousError?: string;
  signal: AbortSignal;
};

export type AgentResponse = {
  /** AgenticOrg's own run ID, for the audit trail. */
  runId: string | null;
  /** Parsed JSON or raw text; the caller validates it. */
  output: unknown;
  /** The agent's self-reported confidence, when AgenticOrg gives one. */
  confidence?: number | null;
  /** Why AgenticOrg held the run for human approval, if it did. */
  heldForApproval?: string | null;
};

export interface AgentClient {
  mode: "live" | "stub";
  run(req: AgentRequest): Promise<AgentResponse>;
}

export function agentClient(): AgentClient {
  return integrationMode("agenticorg") === "stub" ? stubClient : liveClient;
}

// POST /api/v1/agents/{uuid}/run runs a custom agent synchronously (see
// docs/vendor/agenticorg.md). FresherCoachAgent reads one `task` input holding
// our JSON envelope and replies with one JSON object.
const RunResponse = z.object({
  run_id: z.string().nullish(),
  status: z.string(),
  output: z.unknown(),
  confidence: z.number().nullish(),
  hitl_trigger: z.string().nullish(),
  error: z.unknown().optional(),
});

// A held run still carries the agent's full reply. Hints and practice feedback
// are advisory, so they use it and the hold stays in AgenticOrg's approval queue;
// the certificate decision (full_eval) waits for a human.
const ADVISORY_TASKS: ReadonlySet<AgentTask> = new Set(["hint", "quick_eval", "followup", "course_plan", "company_prep"]);

const liveClient: AgentClient = {
  mode: "live",
  async run({ task, input, previousError, signal }) {
    const e = env();
    // CourseCreatorAgent writes practice courses; FresherCoachAgent does the rest, company prep included.
    const [agentId, agentVar] =
      task === "course_plan"
        ? [e.AGENTICORG_COURSE_AGENT_ID, "AGENTICORG_COURSE_AGENT_ID"]
        : [e.AGENTICORG_AGENT_ID, "AGENTICORG_AGENT_ID"];
    if (!e.AGENTICORG_API_KEY || !agentId) {
      throw new Error(`AGENTICORG_API_KEY / ${agentVar} are not set`);
    }
    const envelope = { task, input, ...(previousError ? { previous_error: previousError } : {}) };
    const res = await fetch(`${e.AGENTICORG_BASE_URL}/api/v1/agents/${agentId}/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${e.AGENTICORG_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ action: "process", inputs: { task: JSON.stringify(envelope) }, context: {} }),
      signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`AgenticOrg run returned ${res.status}: ${text.slice(0, 300)}`);
    const run = RunResponse.parse(JSON.parse(text));
    const held = run.status === "hitl_triggered";
    if (held && (run.output == null || !ADVISORY_TASKS.has(task))) {
      throw new Error(`AgenticOrg held the run for human approval (${run.hitl_trigger ?? "no reason given"})`);
    }
    if (run.status !== "completed" && !held) {
      throw new Error(`AgenticOrg run ${run.status}: ${JSON.stringify(run.error ?? run.output ?? "").slice(0, 300)}`);
    }
    return {
      runId: run.run_id ?? null,
      output: unwrapOutput(run.output),
      confidence: run.confidence ?? null,
      heldForApproval: held ? (run.hitl_trigger ?? "held for approval") : null,
    };
  },
};

/**
 * Agents return their reply as a JSON object (FresherCoachAgent does), a JSON
 * string, or an object wrapping the reply text (e.g. {"response": "..."});
 * fences are sometimes added. Return the reply as parsed JSON when possible so
 * the caller's schema can check it. Never throws: bad output fails validation.
 */
export function unwrapOutput(output: unknown): unknown {
  if (typeof output === "string") return parseObject(output) ?? output.trim();
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const o = output as Record<string, unknown>;
    // A wrapped reply, e.g. {"result": "{\"hint\": ...}"}. A real reply such as
    // {"hint": "..."} is left alone: only strings holding a JSON object unwrap.
    if (Object.keys(o).length <= 3) {
      for (const k of ["response", "result", "output", "text", "answer", "content", "message"]) {
        const v = o[k];
        if (v && typeof v === "object" && !Array.isArray(v)) return v;
        const parsed = typeof v === "string" ? parseObject(v) : undefined;
        if (parsed) return parsed;
      }
    }
  }
  return output;
}

function parseObject(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  for (const candidate of [trimmed, trimmed.match(/\{[\s\S]*\}/)?.[0]]) {
    if (!candidate?.startsWith("{")) continue;
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Not JSON; try the next candidate.
    }
  }
  return undefined;
}

// Stub mode: local development only (production needs ALLOW_STUBS=true). Runs are
// recorded with mode='stub' and excluded from every traction count.
const STUB_HINTS: Record<string, string> = {
  behavioral: "Pick one real moment. What was the situation, what did you do yourself, and what changed because of it?",
  situational: "Before solving it, list two or three possible causes. Which one would you check first, and how?",
  domain: "Start with a one-line definition, then give a simple example. What would a beginner need to hear first?",
};

const stubClient: AgentClient = {
  mode: "stub",
  async run({ task, input }) {
    if (task === "hint") {
      return { runId: null, output: { hint: STUB_HINTS[String(input.kind)] ?? STUB_HINTS.situational } };
    }
    if (task === "quick_eval") {
      const answers = (input.answers as { signals: { word_count: number; filler_count: number } }[]) ?? [];
      const words = answers.reduce((n, a) => n + a.signals.word_count, 0) / Math.max(1, answers.length);
      const fillers = answers.reduce((n, a) => n + a.signals.filler_count, 0);
      const estimate = Math.round(Math.min(75, Math.max(20, 30 + (Math.min(words, 150) / 150) * 40 - fillers * 2)));
      return {
        runId: null,
        output: {
          overall_estimate: estimate,
          strength: "You answered every question instead of skipping, which already puts you ahead of many freshers.",
          fixes: [
            "Open each answer with a one-line summary of your approach before the details.",
            "Back up at least one claim with a specific example or number from your own experience.",
          ],
        },
      };
    }
    if (task === "course_plan" || task === "company_prep") {
      const quiz = {
        question: "What should the first sentence of an answer do?",
        options: ["Give the answer in one line", "Thank the interviewer", "List every tool you know", "Ask to skip"],
        answer: 0,
        explain: "Leading with the answer shows you understood the question.",
      };
      const lesson = (title: string) => ({
        title,
        why: "Your feedback pointed here, so it is the quickest win.",
        teach: "Start with a one-line summary, then walk through the steps in order, and finish with what changed because of you.",
        example: "In my final-year project I owned the backend. First I listed the APIs we needed, then built and tested them one by one.",
        drill: "Explain one project you are proud of in under two minutes.",
        key_points: ["Lead with the answer", "Explain the steps in order", "End with the result"],
        mistakes: ["Starting with background nobody asked for", "Ending without a result"],
        quiz,
        resources: [{ title: "STAR method explained", query: "STAR method interview answers", kind: "video" }],
      });
      return {
        runId: null,
        output: {
          title: "Sharper answers in 15 minutes",
          summary: "Short lessons built from your feedback, each with a question to practise out loud.",
          lessons: [lesson("Lead with the answer"), lesson("Tell it in order"), lesson("Prove it with a number")],
          final_test: [quiz, quiz, quiz],
        },
      };
    }
    throw new Error(`stub agent has no ${task} task yet`);
  },
};
