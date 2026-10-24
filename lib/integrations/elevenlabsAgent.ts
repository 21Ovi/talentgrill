import { z } from "zod";
import { FIRST_MESSAGE, INTERVIEWER_PROMPT, INTERVIEWER_VERSION } from "../agent/interviewer";
import { env } from "../env";
import { recordError, recordSuccess } from "./status";

// ElevenLabs Agents (REST, snake_case). See docs/vendor/elevenlabs-agents.md.
const API = "https://api.elevenlabs.io/v1/convai";
const TIMEOUT_MS = 20_000;
const AGENT_NAME = `TalentGrill Interviewer v${INTERVIEWER_VERSION}`;

// Client tools run in the candidate's browser (components/LiveInterview.tsx).
const TOOLS = [
  {
    type: "client",
    name: "mark_question",
    description: "Call right before asking an interview question, with that question's number from the list.",
    expects_response: false,
    parameters: {
      type: "object",
      required: ["number"],
      properties: { number: { type: "integer", description: "The question's number in the list, starting at 1." } },
    },
  },
  {
    type: "client",
    name: "get_hint",
    description:
      "Call when the candidate says they are stuck or asks for help. Returns a short hint to share in your own words.",
    expects_response: true,
    response_timeout_secs: 30,
    parameters: {
      type: "object",
      required: ["number", "said_so_far"],
      properties: {
        number: { type: "integer", description: "The current question's number." },
        said_so_far: { type: "string", description: "A short summary of what the candidate has said for this question." },
      },
    },
  },
];

async function call<T>(path: string, init: { method: string; body?: unknown }, schema: z.ZodType<T>): Promise<T> {
  const key = env().ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  try {
    const res = await fetch(`${API}${path}`, {
      method: init.method,
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`ElevenLabs ${path.split("?")[0]} returned ${res.status}: ${text.slice(0, 300)}`);
    const parsed = schema.parse(JSON.parse(text));
    recordSuccess("elevenlabs");
    return parsed;
  } catch (err) {
    recordError("elevenlabs", err);
    throw err;
  }
}

const g = globalThis as unknown as { __interviewerAgent?: Promise<string> };

/** The interviewer agent's id: pinned by env, else found by name or created once. */
export function interviewerAgentId(): Promise<string> {
  const pinned = env().ELEVENLABS_AGENT_ID;
  if (pinned) return Promise.resolve(pinned);
  g.__interviewerAgent ??= ensureAgent().catch((err) => {
    g.__interviewerAgent = undefined;
    throw err;
  });
  return g.__interviewerAgent;
}

async function ensureAgent(): Promise<string> {
  const list = await call(
    `/agents?search=${encodeURIComponent(AGENT_NAME)}&page_size=30`,
    { method: "GET" },
    z.object({ agents: z.array(z.object({ agent_id: z.string(), name: z.string() })) }),
  );
  const existing = list.agents.find((a) => a.name === AGENT_NAME);
  if (existing) return existing.agent_id;

  const toolIds = [];
  for (const tool of TOOLS) {
    const created = await call("/tools", { method: "POST", body: { tool_config: tool } }, z.object({ id: z.string() }));
    toolIds.push(created.id);
  }
  const agent = await call(
    "/agents/create",
    {
      method: "POST",
      body: {
        name: AGENT_NAME,
        conversation_config: {
          agent: {
            first_message: FIRST_MESSAGE,
            language: "en",
            dynamic_variables: {
              dynamic_variable_placeholders: {
                session_id: "",
                user_name: "there",
                role_label: "your target role",
                question_count: "2",
                questions: "1. Tell me about a project you are proud of.",
              },
            },
            prompt: {
              prompt: INTERVIEWER_PROMPT,
              llm: "gemini-2.5-flash",
              temperature: 0.5,
              tool_ids: toolIds,
              built_in_tools: {
                end_call: {
                  type: "system",
                  name: "end_call",
                  description: "End the call after you have thanked the candidate and said goodbye.",
                  params: { system_tool_type: "end_call" },
                },
              },
            },
          },
          // English agents must use a v2 (not v2.5) turbo/flash voice model.
          tts: { voice_id: env().ELEVENLABS_VOICE_ID, model_id: "eleven_flash_v2" },
          turn: { turn_timeout: 10, turn_eagerness: "patient" },
          conversation: { max_duration_seconds: 900 },
        },
        // Private agent: a browser can only join with a token we mint.
        platform_settings: { auth: { enable_auth: true } },
      },
    },
    z.object({ agent_id: z.string() }),
  );
  return agent.agent_id;
}

/** A short-lived WebRTC token for one call with a private agent. */
export async function conversationToken(agentId: string, participantName: string): Promise<string> {
  const res = await call(
    `/conversation/token?agent_id=${encodeURIComponent(agentId)}&participant_name=${encodeURIComponent(participantName)}`,
    { method: "GET" },
    z.object({ token: z.string() }),
  );
  return res.token;
}

const Turn = z.object({
  role: z.string(),
  message: z.string().nullish(),
  time_in_call_secs: z.number().nullish(),
  tool_calls: z
    .array(z.object({ tool_name: z.string().nullish(), params_as_json: z.string().nullish() }).loose())
    .nullish(),
});
export type Turn = z.infer<typeof Turn>;

const Conversation = z
  .object({
    agent_id: z.string(),
    status: z.string(),
    transcript: z.array(Turn.loose()).default([]),
    metadata: z.object({ call_duration_secs: z.number().nullish() }).loose().nullish(),
    conversation_initiation_client_data: z
      .object({ dynamic_variables: z.record(z.string(), z.unknown()).nullish() })
      .loose()
      .nullish(),
  })
  .loose();
export type Conversation = z.infer<typeof Conversation>;

export function getConversation(conversationId: string): Promise<Conversation> {
  return call(`/conversations/${encodeURIComponent(conversationId)}`, { method: "GET" }, Conversation);
}

export type QuestionPart = { number: number; transcript: string; durationMs: number; hints: number };

/**
 * Splits a call into one candidate answer per question. Boundaries come from
 * the agent's mark_question tool calls; if the agent skipped one, an agent line
 * that opens with a question's first words also starts that question.
 */
export function splitTranscript(turns: Turn[], questions: { number: number; text: string }[]): QuestionPart[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const openings = questions.map((q) => ({ number: q.number, opening: norm(q.text).split(" ").slice(0, 6).join(" ") }));
  const parts = new Map<number, { texts: string[]; ms: number; hints: number }>();
  const part = (n: number) => {
    if (!parts.has(n)) parts.set(n, { texts: [], ms: 0, hints: 0 });
    return parts.get(n)!;
  };

  let current: number | null = null;
  turns.forEach((t, i) => {
    if (t.role === "agent") {
      for (const c of t.tool_calls ?? []) {
        let params: { number?: unknown } = {};
        try {
          params = JSON.parse(c.params_as_json ?? "{}");
        } catch {}
        const n = Number(params.number);
        if (!questions.some((q) => q.number === n)) continue;
        if (c.tool_name === "mark_question") current = n;
        if (c.tool_name === "get_hint") part(n).hints++;
      }
      const said = norm(t.message ?? "");
      const opened = openings.find((o) => o.opening && said.includes(o.opening));
      if (opened) current = opened.number;
    } else if (t.role === "user" && current !== null && t.message?.trim()) {
      const p = part(current);
      p.texts.push(t.message.trim());
      const start = t.time_in_call_secs ?? null;
      const next = turns[i + 1]?.time_in_call_secs ?? null;
      const words = t.message.trim().split(/\s+/).length;
      p.ms += start !== null && next !== null && next > start ? (next - start) * 1000 : Math.round((words / 2.5) * 1000);
    }
  });

  return [...parts.entries()]
    .filter(([, p]) => p.texts.length > 0)
    .map(([number, p]) => ({ number, transcript: p.texts.join(" "), durationMs: Math.round(p.ms), hints: p.hints }));
}
