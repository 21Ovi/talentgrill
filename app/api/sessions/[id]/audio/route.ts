import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound } from "@/lib/http";
import { speakCached, voiceClient, type VoiceClient } from "@/lib/integrations/elevenlabs";
import { clientIp, take } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";

// The question read aloud by ElevenLabs. Any failure is a non-audio response,
// and the browser falls back to its own voice.
export async function GET(req: Request, ctx: RouteContext<"/api/sessions/[id]/audio">) {
  const { id } = await ctx.params;
  const questionId = new URL(req.url).searchParams.get("q") ?? "";
  if (!isUuid(id) || !isUuid(questionId)) return notFound();
  return handle(
    "question_audio",
    async () => {
      if (!take(`tts:session:${id}`, 20, 1 / 10) || !take(`tts:ip:${clientIp(req)}`, 300, 5)) {
        throw new HttpError(429, "Too many plays. Read the question on screen for now.");
      }
      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      // Only questions this session can already see: no pro questions before payment.
      const q = s.questions.find((x) => x.id === questionId);
      if (!q) return notFound("Question");

      let client: VoiceClient;
      try {
        client = voiceClient();
      } catch (err) {
        return json({ error: String(err) }, 503);
      }
      if (client.mode === "stub") return json({ error: "Voice is in stub mode." }, 503);

      const { audio, cached } = await speakCached(client, q.question_text);
      await logEvent({
        actor: "user",
        type: "question_audio_played",
        userId: s.userId,
        sessionId: id,
        payload: { question_id: q.id, cached, bytes: audio.byteLength, ...requestMeta(req) },
      });
      return new Response(audio as BodyInit, {
        headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" },
      });
    },
    { sessionId: id },
  );
}
