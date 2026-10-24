import type { AgentTask } from "../agent/schemas";
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
};

export interface AgentClient {
  mode: "live" | "stub";
  run(req: AgentRequest): Promise<AgentResponse>;
}

export function agentClient(): AgentClient {
  return integrationMode("agenticorg") === "stub" ? stubClient : liveClient;
}

const liveClient: AgentClient = {
  mode: "live",
  async run() {
    // TODO(VENDOR_DOCS: AgenticOrg TS SDK — how to invoke FresherCoachAgent with a
    // task + JSON input, and where its JSON output and run ID come back)
    throw new Error("AgenticOrg live adapter is not wired yet (waiting on docs/vendor/agenticorg.md)");
  },
};

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
    throw new Error(`stub agent has no ${task} task yet`);
  },
};
