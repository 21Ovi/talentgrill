"use client";

import { Mic, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, Notice, Orb, type OrbState } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";
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

const ORB_STATE: Record<Phase["name"], OrbState> = { idle: "idle", recording: "listening", transcribing: "thinking" };

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
  // Kept after a failed upload so a flaky connection doesn't cost the answer.
  const [failed, setFailed] = useState<{ audio: Blob; durationMs: number } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const discard = useRef(false);
  const orb = useRef<HTMLSpanElement>(null);
  const meter = useRef<{ ac: AudioContext; raf: number } | null>(null);

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
      stopMeter();
    };
  }, []);

  /** Drives the orb's --level from the mic, outside React's render loop. */
  function startMeter(stream: MediaStream) {
    try {
      const ac = new AudioContext();
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      ac.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let level = 0;
      const frame = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const target = Math.min(1, Math.sqrt(sum / buf.length) * 7);
        level += (target - level) * (target > level ? 0.45 : 0.1); // quick attack, slow release
        orb.current?.style.setProperty("--level", level.toFixed(3));
        if (meter.current) meter.current.raf = requestAnimationFrame(frame);
      };
      meter.current = { ac, raf: requestAnimationFrame(frame) };
    } catch {
      // The level meter is decoration; recording works without it.
    }
  }

  function stopMeter() {
    if (!meter.current) return;
    cancelAnimationFrame(meter.current.raf);
    void meter.current.ac.close();
    meter.current = null;
    orb.current?.style.setProperty("--level", "0");
  }

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
      cue("notify");
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
      stopMeter();
      stream.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      if (discard.current) return;
      cue("stop");
      void upload(new Blob(chunks, { type: rec.mimeType }), Date.now() - startedAt);
    };
    rec.start(1000);
    recorder.current = rec;
    cue("start");
    startMeter(stream);
    setNow(startedAt);
    setPhase({ name: "recording", startedAt });
  }

  if (take) {
    const s = computeSignals(take.transcript, "voice", take.durationMs);
    const stats = [
      `${s.word_count} words`,
      `${s.filler_count} filler${s.filler_count === 1 ? "" : "s"}`,
      ...(s.words_per_minute ? [`${s.words_per_minute} words/min`] : []),
    ];
    return (
      <section className="arrive flex flex-col gap-4 rounded-[24px] bg-surface p-5 shadow-[var(--shadow-sheet)] ring-1 ring-line ring-inset">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold">Your answer, as we heard it</h3>
          <Button variant="quiet" size="sm" disabled={disabled} onClick={() => onTake(null)} className="-mr-2">
            <RotateCcw className="size-4" /> Record again
          </Button>
        </div>
        <p className="text-[17px] leading-relaxed">{take.transcript}</p>
        <ul className="flex flex-wrap gap-2" aria-label="Delivery">
          {stats.map((stat) => (
            <li key={stat} className="rounded-full bg-sunken px-3 py-1 text-sm tabular-nums text-muted">
              {stat}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const elapsed = phase.name === "recording" ? Math.max(0, now - phase.startedAt) : 0;
  const clock = `${Math.floor(elapsed / 60_000)}:${String(Math.floor((elapsed % 60_000) / 1000)).padStart(2, "0")}`;
  const recording = phase.name === "recording";

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <button
        type="button"
        onClick={() => (recording ? recorder.current?.stop() : start())}
        disabled={disabled || phase.name === "transcribing"}
        aria-label={recording ? "Stop recording" : "Start recording your answer"}
        className="rounded-full transition-[scale] duration-300 ease-spring active:scale-[0.94] disabled:opacity-100"
      >
        <Orb ref={orb} state={ORB_STATE[phase.name]} className="size-40">
          {phase.name === "idle" && <Mic className="size-9" strokeWidth={2.2} />}
          {recording && <Square className="size-7 fill-current" />}
        </Orb>
      </button>

      <div className="flex min-h-12 flex-col items-center gap-0.5 text-center" aria-live="polite">
        {phase.name === "idle" && <p className="text-[17px] text-muted">Tap the orb and answer out loud</p>}
        {recording && (
          <>
            <p className="text-[17px] font-semibold tabular-nums text-ember-text">{clock}</p>
            <p className="text-[15px] text-muted">Tap again when you&apos;re done</p>
          </>
        )}
        {phase.name === "transcribing" && <p className="text-[17px] text-muted">Listening back to your answer…</p>}
      </div>

      {error && (
        <div className="flex w-full flex-col items-start gap-2">
          <Notice key={error}>{error}</Notice>
          {failed && phase.name === "idle" && (
            <Button variant="secondary" size="sm" onClick={() => upload(failed.audio, failed.durationMs)}>
              <RotateCcw className="size-4" /> Send this recording again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
