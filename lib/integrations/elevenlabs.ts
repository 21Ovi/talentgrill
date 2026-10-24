import { createHash } from "node:crypto";
import { z } from "zod";
import { env } from "../env";
import { integrationMode, recordError, recordSuccess } from "./status";

const API = "https://api.elevenlabs.io/v1";
// Lowest-latency multilingual voice model; questions are short, so quality holds up.
const TTS_MODEL = "eleven_flash_v2_5";
// Verbatim by default: keeps the "um"s and "uh"s that the filler count depends on.
const STT_MODEL = "scribe_v2";
const TIMEOUT_MS = 30_000;

export type Word = { text: string; start: number | null; end: number | null };

export type Transcription = {
  text: string;
  /** Spoken words only (no spacing or audio events), with times in seconds. */
  words: Word[];
  languageCode: string | null;
};

export interface VoiceClient {
  mode: "live" | "stub";
  speak(text: string): Promise<Uint8Array>;
  transcribe(audio: Blob): Promise<Transcription>;
}

/** Throws if ElevenLabs is misconfigured; the caller decides how to tell the user. */
export function voiceClient(): VoiceClient {
  return integrationMode("elevenlabs") === "stub" ? stubClient : liveClient;
}

const SttResponse = z.object({
  text: z.string(),
  language_code: z.string().nullish(),
  words: z
    .array(
      z.object({
        text: z.string(),
        type: z.string(),
        start: z.number().nullish(),
        end: z.number().nullish(),
      }),
    )
    .default([]),
});

async function call(path: string, init: RequestInit): Promise<Response> {
  const key = env().ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...init.headers, "xi-api-key": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`ElevenLabs ${path.split("?")[0]} returned ${res.status}: ${detail}`);
    }
    recordSuccess("elevenlabs");
    return res;
  } catch (err) {
    recordError("elevenlabs", err);
    throw err;
  }
}

const liveClient: VoiceClient = {
  mode: "live",
  async speak(text) {
    const res = await call(`/text-to-speech/${env().ELEVENLABS_VOICE_ID}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: TTS_MODEL, language_code: "en" }),
    });
    return new Uint8Array(await res.arrayBuffer());
  },
  async transcribe(audio) {
    const form = new FormData();
    form.set("model_id", STT_MODEL);
    form.set("file", audio, "answer");
    form.set("language_code", "en");
    form.set("tag_audio_events", "false");
    form.set("timestamps_granularity", "word");
    const res = await call("/speech-to-text", { method: "POST", body: form });
    const parsed = SttResponse.parse(await res.json());
    return {
      text: parsed.text.trim(),
      words: parsed.words
        .filter((w) => w.type === "word")
        .map((w) => ({ text: w.text, start: w.start ?? null, end: w.end ?? null })),
      languageCode: parsed.language_code ?? null,
    };
  },
};

// Stub mode: local development without a key (production needs ALLOW_STUBS=true).
// Takes are stored with mode='stub' and excluded from counts.
const STUB_TRANSCRIPT =
  "Um, in my final year project I basically built a small web app for our college canteen. " +
  "I handled the backend, and orders went from paper slips to about forty online orders a day.";

const stubClient: VoiceClient = {
  mode: "stub",
  async speak() {
    throw new Error("ElevenLabs is in stub mode: no question audio");
  },
  async transcribe() {
    return { text: STUB_TRANSCRIPT, words: [], languageCode: "en" };
  },
};

// Question audio is identical for everyone, so a crowd pressing Play on the same
// question costs one ElevenLabs call. In memory: we run exactly one instance.
const MAX_CACHED = 200;
const g = globalThis as unknown as { __ttsCache?: Map<string, Promise<Uint8Array>> };
const ttsCache = (g.__ttsCache ??= new Map<string, Promise<Uint8Array>>());

/** Speaks `text`, sharing cached and in-flight audio. Failed calls are not cached. */
export async function speakCached(client: VoiceClient, text: string): Promise<{ audio: Uint8Array; cached: boolean }> {
  const key = createHash("sha256").update(`${TTS_MODEL}:${env().ELEVENLABS_VOICE_ID}:${text}`).digest("hex");
  const hit = ttsCache.get(key);
  if (hit) return { audio: await hit, cached: true };

  const pending = client.speak(text);
  ttsCache.set(key, pending);
  pending.catch(() => ttsCache.delete(key));
  if (ttsCache.size > MAX_CACHED) ttsCache.delete(ttsCache.keys().next().value!);
  return { audio: await pending, cached: false };
}
