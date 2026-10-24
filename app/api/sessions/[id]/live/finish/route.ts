import { z } from "zod";
import { query, tx } from "@/lib/db";
import { logError, logEvent } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound, readJson } from "@/lib/http";
import { getConversation, splitTranscript, type Conversation } from "@/lib/integrations/elevenlabsAgent";
import { loadSession } from "@/lib/session";
import { wordCount } from "@/lib/signals";

const Body = z.object({ liveCallId: z.uuid(), conversationId: z.string().min(1).max(200) });

type LiveCall = {
  id: string;
  agent_id: string;
  conversation_id: string | null;
  status: string;
  questions: { number: number; question_id: string }[];
};

// ElevenLabs finishes processing a call a few seconds after it ends.
const POLL_MS = 2_500;
const MAX_POLLS = 12;

async function settledConversation(conversationId: string): Promise<Conversation> {
  let conv = await getConversation(conversationId);
  for (let i = 0; i < MAX_POLLS && conv.status !== "done" && conv.status !== "failed"; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    conv = await getConversation(conversationId);
  }
  return conv;
}

// Saves a finished live call: the transcript comes from ElevenLabs, never from
// the browser, and becomes one voice take + answer per question.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/live/finish">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "live_finish",
    async () => {
      const body = await readJson(req, Body);
      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      const [call] = await query<LiveCall>("select * from live_calls where id = $1 and session_id = $2", [body.liveCallId, id]);
      if (!call) throw new HttpError(404, "Call not found.");
      if (call.status === "SAVED") return json({ saved: 0, next: s.next });

      // Bind the conversation to this call once; a conversation can't be reused.
      const bound = await query(
        `update live_calls set conversation_id = $2
          where id = $1 and (conversation_id is null or conversation_id = $2)
            and not exists (select 1 from live_calls where conversation_id = $2 and id <> $1)
          returning id`,
        [call.id, body.conversationId],
      );
      if (bound.length === 0 && call.conversation_id !== body.conversationId) {
        throw new HttpError(409, "That conversation doesn't belong to this interview.");
      }

      let conv: Conversation;
      try {
        conv = await settledConversation(body.conversationId);
      } catch (err) {
        await query("update live_calls set status = 'FAILED', error = $2, ended_at = now() where id = $1", [call.id, String(err)]);
        await logError("live_finish", err, { sessionId: id, userId: s.userId, payload: { live_call_id: call.id } });
        throw new HttpError(502, "We couldn't fetch your interview recording. You can answer the rest by typing.");
      }
      const vars = conv.conversation_initiation_client_data?.dynamic_variables ?? {};
      if (conv.agent_id !== call.agent_id || (vars.session_id !== undefined && vars.session_id !== id)) {
        throw new HttpError(409, "That conversation doesn't belong to this interview.");
      }

      const texts = call.questions.map((q) => ({
        number: q.number,
        question_id: q.question_id,
        text: s.questions.find((x) => x.id === q.question_id)?.question_text ?? "",
      }));
      const parts = splitTranscript(conv.transcript, texts).filter((p) => wordCount(p.transcript) >= 2);
      const durationSecs = Math.round(conv.metadata?.call_duration_secs ?? 0);

      const saved = await tx(async (db) => {
        // A double submit waits here, then sees SAVED and stops.
        const [locked] = (await db.query<{ status: string }>("select status from live_calls where id = $1 for update", [call.id])).rows;
        if (locked.status === "SAVED") return 0;
        let count = 0;
        for (const p of parts) {
          const q = texts.find((t) => t.number === p.number)!;
          const [take] = (
            await db.query<{ id: string }>(
              `insert into voice_takes (session_id, question_id, mode, transcript, words, duration_ms, audio_bytes, language_code, live_call_id)
               values ($1, $2, 'live', $3, '[]', $4, 0, 'en', $5) returning id`,
              [id, q.question_id, p.transcript, p.durationMs, call.id],
            )
          ).rows;
          const inserted = await db.query(
            `insert into answers (session_id, question_id, input_mode, transcript, duration_ms, hints_used, voice_take_id)
             values ($1, $2, 'voice', $3, $4, $5, $6)
             on conflict (session_id, question_id) where question_id is not null do nothing`,
            [id, q.question_id, p.transcript, p.durationMs, p.hints, take.id],
          );
          if (inserted.rowCount === 0) continue;
          count++;
          await logEvent(
            {
              actor: "user",
              type: "answer_submitted",
              userId: s.userId,
              sessionId: id,
              payload: {
                question_id: q.question_id,
                tier: "free",
                mode: "voice",
                via: "live",
                live_call_id: call.id,
                word_count: wordCount(p.transcript),
                duration_ms: p.durationMs,
                hints_used: p.hints,
              },
            },
            db,
          );
        }
        await db.query(
          "update live_calls set status = 'SAVED', transcript = $2, duration_secs = $3, ended_at = now() where id = $1",
          [call.id, JSON.stringify(conv.transcript), durationSecs],
        );
        await logEvent(
          {
            actor: "system",
            type: "live_interview_saved",
            userId: s.userId,
            sessionId: id,
            payload: {
              live_call_id: call.id,
              conversation_id: body.conversationId,
              answered: count,
              of: call.questions.length,
              duration_secs: durationSecs,
              status: conv.status,
            },
          },
          db,
        );
        return count;
      });

      const after = await loadSession(id);
      return json({ saved, next: after?.next ?? s.next });
    },
    { sessionId: id },
  );
}
