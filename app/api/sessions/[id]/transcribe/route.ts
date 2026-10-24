import { z } from "zod";
import { query } from "@/lib/db";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound } from "@/lib/http";
import { voiceClient, type VoiceClient } from "@/lib/integrations/elevenlabs";
import { clientIp, take } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";
import { wordCount } from "@/lib/signals";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // ~40 minutes of Opus; the browser stops at 3
const MIN_AUDIO_BYTES = 1024;

const Fields = z.object({
  questionId: z.uuid(),
  durationMs: z.coerce.number().int().min(1_000, "That recording was too short.").max(10 * 60_000),
});

/**
 * Transcribes one recorded answer and stores it as a voice take. The answer
 * route saves the take's transcript, so the browser never supplies the text.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/transcribe">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "transcribe",
    async () => {
      if (!take(`stt:session:${id}`, 10, 1 / 30) || !take(`stt:ip:${clientIp(req)}`, 200, 3)) {
        throw new HttpError(429, "That's a lot of recordings in a row. Take a breath, then try again.");
      }
      let form: FormData;
      try {
        form = await req.formData();
      } catch {
        throw new HttpError(400, "Upload the recording as form data.");
      }
      const fields = Fields.safeParse({ questionId: form.get("questionId"), durationMs: form.get("durationMs") });
      if (!fields.success) throw new HttpError(400, fields.error.issues[0]?.message ?? "Invalid request.");
      const audio = form.get("audio");
      if (!(audio instanceof Blob) || audio.size < MIN_AUDIO_BYTES) {
        throw new HttpError(400, "The recording is empty. Check your microphone and try again.");
      }
      if (audio.size > MAX_AUDIO_BYTES) throw new HttpError(413, "That recording is too long.");

      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      const q = s.current;
      if (q?.id !== fields.data.questionId) {
        throw new HttpError(409, "That question isn't open any more. Refresh to continue.");
      }

      let client: VoiceClient;
      try {
        client = voiceClient();
      } catch (err) {
        await logEvent({ actor: "system", type: "transcribe_failed", userId: s.userId, sessionId: id, payload: { error: String(err) } });
        return json({ error: "Voice answers are unavailable right now. Please type your answer instead." }, 503);
      }

      const started = Date.now();
      let text: string;
      let words: unknown;
      let languageCode: string | null;
      try {
        ({ text, words, languageCode } = await client.transcribe(audio));
      } catch (err) {
        await logEvent({
          actor: "system",
          type: "transcribe_failed",
          userId: s.userId,
          sessionId: id,
          payload: { question_id: q.id, mode: client.mode, error: err instanceof Error ? err.message : String(err) },
        });
        return json({ error: "Couldn't transcribe that. Please try again, or type your answer.", retry: true }, 502);
      }
      if (wordCount(text) < 2) {
        throw new HttpError(422, "We couldn't hear an answer. Speak a little closer to the mic and try again.");
      }

      const [take_] = await query<{ id: string }>(
        `insert into voice_takes (session_id, question_id, mode, transcript, words, duration_ms, audio_bytes, language_code)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [id, q.id, client.mode, text, JSON.stringify(words), fields.data.durationMs, audio.size, languageCode],
      );
      await logEvent({
        actor: "user",
        type: "voice_answer_recorded",
        userId: s.userId,
        sessionId: id,
        payload: {
          question_id: q.id,
          voice_take_id: take_.id,
          mode: client.mode,
          duration_ms: fields.data.durationMs,
          audio_bytes: audio.size,
          word_count: wordCount(text),
          latency_ms: Date.now() - started,
          ...requestMeta(req),
        },
      });
      return json({ voiceTakeId: take_.id, transcript: text });
    },
    { sessionId: id },
  );
}
