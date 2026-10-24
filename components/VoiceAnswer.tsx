"use client";

import { Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, errorMessage } from "@/lib/clientApi";
import { computeSignals } from "@/lib/signals";

const MAX_MS = 3 * 60_000;
// Chrome and Firefox record Opus in WebM; Safari only records MP4.
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export type VoiceTake = { id: string; transcript: string; durationMs: number };

const noSubscribe = () => () => {};

/** False during server rendering and in browsers without MediaRecorder. */
export function useCanRecord(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );
}

type Phase = { name: "idle" } | { name: "recording"; startedAt: number } | { name: "transcribing" };

export function VoiceAnswer({
  sessionId,
  questionId,
  take,
  onTake,
  disabled,
}: {
  sessionId: string;
  questionId: string;
  take: VoiceTake | null;
  onTake: (take: VoiceTake | null) => void;
  disabled: boolean;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  // Kept after a failed upload so a flaky connection doesn't cost the answer.
  const [failed, setFailed] = useState<{ audio: Blob; durationMs: number } | null>(null);
  const discard = useRef(false);

  useEffect(() => {
    if (phase.name !== "recording") return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - phase.startedAt >= MAX_MS) recorder.current?.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  // Leaving the question mid-recording drops the recording instead of uploading it.
  useEffect(() => {
    discard.current = false; // Strict Mode remounts after running the cleanup below
    return () => {
      discard.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
    };
  }, []);

  async function upload(audio: Blob, durationMs: number) {
    setPhase({ name: "transcribing" });
    setError(null);
    const form = new FormData();
    form.set("questionId", questionId);
    form.set("durationMs", String(durationMs));
    form.set("audio", audio, audio.type.includes("mp4") ? "answer.mp4" : "answer.webm");
    try {
      const res = await api<{ voiceTakeId: string; transcript: string }>(`/api/sessions/${sessionId}/transcribe`, form);
      setFailed(null);
      onTake({ id: res.voiceTakeId, transcript: res.transcript, durationMs });
    } catch (err) {
      setFailed({ audio, durationMs });
      setError(errorMessage(err));
    }
    setPhase({ name: "idle" });
  }

  async function start() {
    setError(null);
    setFailed(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Allow microphone access to answer out loud, or switch to typing.");
      return;
    }
    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      if (discard.current) return;
      void upload(new Blob(chunks, { type: rec.mimeType }), Date.now() - startedAt);
    };
    rec.start(1000);
    recorder.current = rec;
    setNow(startedAt);
    setPhase({ name: "recording", startedAt });
  }

  if (take) {
    const s = computeSignals(take.transcript, "voice", take.durationMs);
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Your answer, as we heard it</p>
        <p className="rounded-2xl border border-stone-300 bg-white p-4 text-base leading-relaxed">{take.transcript}</p>
        <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
          <span>
            {s.word_count} words · {s.filler_count} filler{s.filler_count === 1 ? "" : "s"}
            {s.words_per_minute ? ` · ${s.words_per_minute} words/min` : ""}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onTake(null)}
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-stone-300 px-3 font-medium text-stone-700 disabled:opacity-60"
          >
            <RotateCcw className="size-4" /> Record again
          </button>
        </div>
      </div>
    );
  }

  const elapsed = phase.name === "recording" ? Math.max(0, now - phase.startedAt) : 0;
  const clock = `${Math.floor(elapsed / 60_000)}:${String(Math.floor((elapsed % 60_000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-300 bg-white p-5">
      {phase.name === "idle" && (
        <>
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            aria-label="Start recording your answer"
            className="flex size-20 items-center justify-center rounded-full bg-orange-600 text-white shadow-sm hover:bg-orange-700 disabled:opacity-60"
          >
            <Mic className="size-8" />
          </button>
          <p className="text-sm text-stone-600">Tap and answer out loud, like in the real interview.</p>
        </>
      )}
      {phase.name === "recording" && (
        <>
          <button
            type="button"
            onClick={() => recorder.current?.stop()}
            aria-label="Stop recording"
            className="flex size-20 animate-pulse items-center justify-center rounded-full bg-red-600 text-white shadow-sm"
          >
            <Square className="size-7 fill-current" />
          </button>
          <p className="text-sm font-medium tabular-nums text-red-700">Recording {clock} · tap to finish</p>
        </>
      )}
      {phase.name === "transcribing" && (
        <>
          <Loader2 className="size-8 animate-spin text-orange-600" />
          <p className="text-sm text-stone-600">Listening back to your answer…</p>
        </>
      )}
      {error && (
        <div role="alert" className="flex w-full flex-col gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{error}</p>
          {failed && phase.name === "idle" && (
            <button
              type="button"
              onClick={() => upload(failed.audio, failed.durationMs)}
              className="self-start font-semibold underline"
            >
              Retry sending this recording
            </button>
          )}
        </div>
      )}
    </div>
  );
}
