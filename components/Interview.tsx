"use client";

import { Check, Keyboard, Lightbulb, Lock, Mic, RotateCcw, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brand, Button, Notice, Orb, SegmentedControl, Sheet, SoundToggle } from "@/components/ui";
import { LiveInterview } from "@/components/LiveInterview";
import { PracticeCourse } from "@/components/PracticeCourse";
import { useCanRecord, VoiceAnswer, type VoiceTake } from "@/components/VoiceAnswer";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";
import type { PublicState } from "@/lib/session";

type QuickFeedback = NonNullable<PublicState["quickFeedback"]>;
type Current = NonNullable<PublicState["current"]>;

// A jump this big without a paste event (e.g. drag-and-drop) also counts as pasted.
const PASTE_JUMP_CHARS = 80;

export function Interview({ sessionId }: { sessionId: string }) {
  const [view, setView] = useState<PublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when the candidate chooses typing over the live call.
  const [typing, setTyping] = useState(false);

  const load = useCallback(async () => {
    try {
      setView(await api<PublicState>(`/api/sessions/${sessionId}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [sessionId]);

  useEffect(() => {
    let alive = true;
    api<PublicState>(`/api/sessions/${sessionId}`).then(
      (v) => alive && setView(v),
      (err) => alive && setError(errorMessage(err)),
    );
    return () => {
      alive = false;
    };
  }, [sessionId]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between gap-3">
        <Brand />
        <div className="flex items-center gap-1">
          {view && <span className="text-sm text-muted">{view.session.roleLabel}</span>}
          <SoundToggle />
        </div>
      </header>

      {view && <Progress answered={view.progress.answered} total={view.progress.total} />}

      <div className="flex flex-1 flex-col gap-6 pt-8">
        {!view && !error && (
          <div className="flex flex-1 items-center justify-center pb-24">
            <Orb state="thinking" className="size-16" />
          </div>
        )}
        {!view && error && <ErrorPanel message={error} onRetry={load} />}

        {view?.next === "answer" &&
          view.current &&
          (view.liveInterview && view.current.tier === "free" && !typing ? (
            <LiveInterview
              sessionId={sessionId}
              roleLabel={view.session.roleLabel}
              questionCount={view.liveQuestions}
              onDone={load}
              onTypeInstead={() => setTyping(true)}
            />
          ) : (
            <QuestionStep
              key={view.current.id}
              sessionId={sessionId}
              question={view.current}
              total={view.progress.total}
              onSubmitted={load}
            />
          ))}
        {view?.next === "quick_eval" && <QuickEvalStep sessionId={sessionId} onDone={load} />}
        {view?.next === "upsell" && view.quickFeedback && (
          <>
            <FeedbackPanel feedback={view.quickFeedback} firstName={view.user.firstName} />
            {(view.course || view.coursesEnabled) && <PracticeCourse sessionId={sessionId} initial={view.course} />}
            {view.paymentsEnabled ? (
              <UpsellPanel sessionId={sessionId} pricePaise={view.pricePaise} />
            ) : (
              <NextRoundPanel />
            )}
          </>
        )}
        {view?.next === "full_eval" && (
          <section className="arrive flex flex-col items-start gap-4 pt-6">
            <Orb state="thinking" className="size-14" />
            <h2 className="font-serif text-[28px] leading-tight">That&apos;s every question.</h2>
            <p className="text-[17px] text-muted">Your full scorecard is being prepared. Keep this page open.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function QuestionStep({
  sessionId,
  question,
  total,
  onSubmitted,
}: {
  sessionId: string;
  question: Current;
  total: number;
  onSubmitted: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [pasted, setPasted] = useState(false);
  const [hints, setHints] = useState<string[]>(question.hints);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preferVoice, setPreferVoice] = useState(true);
  const [take, setTake] = useState<VoiceTake | null>(null);
  const [playing, setPlaying] = useState(false);
  const shownAt = useRef<number | null>(null);
  const pasteEvent = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const canRecord = useCanRecord();
  const voice = canRecord && preferVoice;

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ready = voice ? !!take : text.trim().length >= 2;

  function onChange(next: string) {
    if (!pasteEvent.current && next.length - text.length > PASTE_JUMP_CHARS) setPasted(true);
    pasteEvent.current = false;
    setText(next);
  }

  function onPaste() {
    pasteEvent.current = true;
    setPasted(true);
  }

  async function askHint() {
    setHintLoading(true);
    setHintError(null);
    try {
      const { hint } = await api<{ hint: string }>(`/api/sessions/${sessionId}/hint`, {
        questionId: question.id,
        partialTranscript: voice ? (take?.transcript ?? "") : text,
      });
      cue("notify");
      setHints((h) => [...h, hint]);
    } catch (err) {
      setHintError(errorMessage(err));
    } finally {
      setHintLoading(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api(
        `/api/sessions/${sessionId}/answers`,
        voice && take
          ? { questionId: question.id, mode: "voice", voiceTakeId: take.id }
          : {
              questionId: question.id,
              mode: "text",
              transcript: text,
              durationMs: shownAt.current ? Date.now() - shownAt.current : undefined,
              pasteDetected: pasted,
            },
      );
      cue("success");
      await onSubmitted();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  }

  function stopSpeaking() {
    audio.current?.pause();
    audio.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(false);
  }

  // ElevenLabs reads the question; if that fails for any reason, the browser's voice does.
  function speak() {
    if (playing) return stopSpeaking();
    stopSpeaking();
    let fellBack = false;
    const fallback = () => {
      // A replaced or unmounted player also rejects; only the current one falls back.
      if (fellBack || audio.current !== a) return;
      fellBack = true;
      if (!("speechSynthesis" in window)) return setPlaying(false);
      const u = new SpeechSynthesisUtterance(question.text);
      u.lang = "en-IN";
      u.rate = 0.95;
      u.onend = u.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(u);
    };
    const a = new Audio(`/api/sessions/${sessionId}/audio?q=${question.id}`);
    a.onerror = fallback;
    a.onended = () => audio.current === a && setPlaying(false);
    a.play().catch(fallback);
    audio.current = a;
    setPlaying(true);
  }

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return (
    <>
      <section className="arrive flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] text-muted">
            Question {question.number} of {total}
          </p>
          <Button variant="secondary" size="sm" onClick={speak} aria-label={playing ? "Stop reading the question" : "Read the question aloud"}>
            {playing ? (
              <span className="eq flex h-3.5 items-end gap-[3px]" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : (
              <Volume2 className="size-4" />
            )}
            {playing ? "Stop" : "Listen"}
          </Button>
        </div>
        <h2 className="font-serif text-[1.75rem] leading-[1.25] tracking-[-0.01em] text-balance sm:text-[2.1rem]">
          {question.text}
        </h2>
      </section>

      {hints.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Hints">
          {hints.map((h, i) => (
            <li key={i} className="arrive flex gap-3">
              <Orb className="mt-1 size-6 shrink-0" />
              <div className="flex flex-col gap-1 rounded-[20px] rounded-tl-md bg-sunken px-4 py-3">
                <p className="font-serif text-[17px] leading-snug">{h}</p>
                {i === hints.length - 1 && <p className="text-sm text-muted">Give it another go.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="arrive flex flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
        {canRecord && (
          <SegmentedControl
            label="Answer by"
            value={preferVoice ? "voice" : "text"}
            onChange={(v) => setPreferVoice(v === "voice")}
            disabled={submitting}
            options={[
              { value: "voice", label: "Speak", icon: <Mic className="size-4" /> },
              { value: "text", label: "Type", icon: <Keyboard className="size-4" /> },
            ]}
          />
        )}

        {voice ? (
          <VoiceAnswer sessionId={sessionId} questionId={question.id} take={take} onTake={setTake} disabled={submitting} />
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="answer" className="sr-only">
              Your answer
            </label>
            <textarea
              id="answer"
              value={text}
              onChange={(e) => onChange(e.target.value)}
              onPaste={onPaste}
              rows={7}
              maxLength={6000}
              placeholder="Answer the way you would say it in the interview…"
              className="resize-none rounded-[24px] bg-surface p-5 text-[17px] leading-relaxed shadow-[var(--shadow-sheet)] ring-1 ring-line ring-inset outline-none transition-shadow duration-300 placeholder:text-faint focus:ring-2 focus:ring-ink/30"
            />
            <div className="flex justify-between px-1 text-sm text-muted">
              <span>{words > 0 && words < 40 ? "Aim for 60–150 words, like a real answer." : ""}</span>
              <span className="tabular-nums">{words} words</span>
            </div>
          </div>
        )}
      </div>

      {hintError && <Notice key={`h-${hintError}`}>{hintError}</Notice>}
      {submitError && <Notice key={`s-${submitError}`}>{submitError}</Notice>}

      {/* Pinned within thumb reach on phones, on a frosted strip. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-auto flex gap-3 border-t border-line bg-canvas/75 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl backdrop-saturate-150 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-10 sm:backdrop-blur-none">
        <Button variant="secondary" size="lg" onClick={askHint} loading={hintLoading} disabled={submitting} className="flex-1">
          {!hintLoading && <Lightbulb className="size-5" />}
          {hintLoading ? "Thinking…" : "I'm stuck"}
        </Button>
        <Button size="lg" onClick={submit} loading={submitting} disabled={!ready} className="flex-[1.4]">
          {submitting ? "Saving…" : "Submit answer"}
        </Button>
      </div>
    </>
  );
}

function QuickEvalStep({ sessionId, onDone }: { sessionId: string; onDone: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    try {
      await api(`/api/sessions/${sessionId}/quick-eval`, {});
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [sessionId, onDone]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  if (error) {
    return (
      <ErrorPanel
        message={error}
        onRetry={async () => {
          setError(null);
          await run();
        }}
      />
    );
  }
  return (
    <section className="arrive flex flex-1 flex-col items-center justify-center gap-6 pb-24 text-center">
      <Orb state="thinking" className="size-28" />
      <div className="flex flex-col gap-2">
        <h2 className="font-serif text-[28px] leading-tight">Reading your answers</h2>
        <p className="text-[17px] text-muted">Your interviewer is writing quick feedback. About 15 seconds.</p>
      </div>
    </section>
  );
}

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

function FeedbackPanel({ feedback, firstName }: { feedback: QuickFeedback; firstName: string }) {
  useEffect(() => cue("success"), []);
  const offset = RING_C * (1 - feedback.overall_estimate / 100);

  return (
    <Sheet className="arrive flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[28px] leading-tight">Nice work, {firstName}.</h2>
          <p className="text-[15px] text-muted">Here&apos;s your quick feedback.</p>
        </div>
        <figure className="relative size-[76px] shrink-0" aria-label={`Early estimate ${feedback.overall_estimate} out of 100`}>
          <svg viewBox="0 0 76 76" className="size-full -rotate-90" aria-hidden>
            <circle cx="38" cy="38" r={RING_R} fill="none" strokeWidth="6" className="stroke-sunken" />
            <circle
              cx="38"
              cy="38"
              r={RING_R}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              className="ring-fill stroke-ember"
              style={{ strokeDashoffset: offset, "--ring-c": RING_C } as React.CSSProperties}
            />
          </svg>
          <figcaption className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-[22px] font-semibold tabular-nums">{feedback.overall_estimate}</span>
            <span className="mt-0.5 text-[11px] text-muted">of 100</span>
          </figcaption>
        </figure>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ok">
          <Check className="size-4 stroke-[2.5]" /> What worked
        </h3>
        <p className="font-serif text-[17px] leading-relaxed">{feedback.strength}</p>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold">Fix these next</h3>
        <ol className="flex flex-col gap-3">
          {feedback.fixes.map((f, i) => (
            <li key={f} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold tabular-nums text-muted">
                {i + 1}
              </span>
              <p className="font-serif text-[17px] leading-relaxed">{f}</p>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-sm text-faint">This is an early estimate from two answers. The full mock scores every rubric dimension.</p>
    </Sheet>
  );
}

const UNLOCKS = [
  "3 more questions, including a tougher round",
  "A full scorecard quoting your own answers",
  "Model-answer outlines for every question",
  "Human review for a verified Interview-Ready certificate",
];

function UpsellPanel({ sessionId, pricePaise }: { sessionId: string; pricePaise: number }) {
  const router = useRouter();
  const [going, setGoing] = useState(false);
  const rupees = (pricePaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  async function unlock() {
    setGoing(true);
    // The click is a funnel signal only; never block checkout on logging it.
    await api(`/api/sessions/${sessionId}/upsell`, {}).catch(() => {});
    router.push(`/checkout/${sessionId}`);
  }

  return (
    <section className="arrive flex flex-col gap-5 pb-10" style={{ "--i": 2 } as React.CSSProperties}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Go the full distance for ₹{rupees}</h2>
        <p className="text-[15px] text-muted">Finish the mock and earn a certificate you can share.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {UNLOCKS.map((item) => (
          <li key={item} className="flex gap-3 text-[16px] leading-snug">
            <Check className="mt-0.5 size-4 shrink-0 stroke-[2.5] text-ok" />
            {item}
          </li>
        ))}
      </ul>
      <Button size="lg" onClick={unlock} loading={going} className="w-full">
        {!going && <Lock className="size-[18px]" />}
        Unlock for ₹{rupees}
      </Button>
      <p className="text-sm text-faint">
        A human reviews your interview before any certificate is issued. Review does not guarantee certification.
      </p>
    </section>
  );
}

// Shown instead of the upsell while payments are on hold.
function NextRoundPanel() {
  const router = useRouter();
  return (
    <section className="arrive flex flex-col gap-4 pb-10" style={{ "--i": 2 } as React.CSSProperties}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Want another round?</h2>
        <p className="text-[15px] text-muted">Practise again, or try a different role. Every round sharpens your answers.</p>
      </div>
      <Button size="lg" variant="secondary" className="w-full" onClick={() => router.push("/")}>
        <RotateCcw className="size-[18px]" />
        Start another interview
      </Button>
    </section>
  );
}

function Progress({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Questions answered">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-sunken">
          <span
            className={`block h-full origin-left rounded-full bg-ember transition-[scale] duration-700 ease-spring ${i < answered ? "scale-x-100" : "scale-x-0"}`}
          />
        </span>
      ))}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);
  useEffect(() => cue("error"), []);
  return (
    <section className="arrive flex flex-col items-start gap-4 pt-6">
      <p className="text-[17px] leading-relaxed">{message}</p>
      <Button
        variant="secondary"
        loading={retrying}
        onClick={async () => {
          setRetrying(true);
          await onRetry();
          setRetrying(false);
        }}
      >
        {!retrying && <RotateCcw className="size-4" />}
        Try again
      </Button>
    </section>
  );
}
