// Deterministic answer signals computed in code, shown next to the agent's
// judgment so the scorecard's numbers don't depend on the LLM.

const FILLERS = ["um", "uh", "like", "basically", "actually", "you know"];

export type Signals = {
  word_count: number;
  filler_count: number;
  fillers: Record<string, number>;
  duration_ms: number | null;
  words_per_minute: number | null;
};

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function computeSignals(transcript: string, mode: "voice" | "text", durationMs: number | null): Signals {
  const lower = transcript.toLowerCase();
  const fillers: Record<string, number> = {};
  for (const f of FILLERS) {
    const n = lower.match(new RegExp(`\\b${f}\\b`, "g"))?.length ?? 0;
    if (n > 0) fillers[f] = n;
  }
  const words = wordCount(transcript);
  return {
    word_count: words,
    filler_count: Object.values(fillers).reduce((a, b) => a + b, 0),
    fillers,
    duration_ms: durationMs,
    // Speaking pace only means something for voice answers.
    words_per_minute: mode === "voice" && durationMs ? Math.round(words / (durationMs / 60_000)) : null,
  };
}
