"use client";

import { CheckCircle2, Lightbulb, Loader2, Lock, RotateCcw, Send, Sparkles, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/clientApi";
import type { PublicState } from "@/lib/session";

type QuickFeedback = NonNullable<PublicState["quickFeedback"]>;
type Current = NonNullable<PublicState["current"]>;

// A jump this big without a paste event (e.g. drag-and-drop) also counts as pasted.
const PASTE_JUMP_CHARS = 80;

export function Interview({ sessionId }: { sessionId: string }) {
  const [view, setView] = useState<PublicState | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-orange-600 text-white">T</span>
          TalentGrill AI
        </div>
        {view && <span className="text-xs font-medium text-stone-500">{view.session.roleLabel}</span>}
      </header>

      {view && <Progress answered={view.progress.answered} total={view.progress.total} />}

      {!view && !error && <Centered><Loader2 className="size-6 animate-spin text-stone-400" /></Centered>}
      {!view && error && <ErrorCard message={error} onRetry={load} />}

      {view?.next === "answer" && view.current && (
        <QuestionStep
          key={view.current.id}
          sessionId={sessionId}
          question={view.current}
          total={view.progress.total}
          onSubmitted={load}
        />
      )}
      {view?.next === "quick_eval" && <QuickEvalStep sessionId={sessionId} onDone={load} />}
      {view?.next === "upsell" && view.quickFeedback && (
        <>
          <FeedbackCard feedback={view.quickFeedback} firstName={view.user.firstName} />
          <UpsellCard sessionId={sessionId} pricePaise={view.pricePaise} />
        </>
      )}
      {view?.next === "full_eval" && (
        <Card>
          <CheckCircle2 className="size-6 text-emerald-600" />
          <h2 className="text-lg font-semibold">All questions answered</h2>
          <p className="text-stone-600">Your full scorecard is being prepared. Keep this page open.</p>
        </Card>
      )}
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
  const shownAt = useRef<number | null>(null);
  const pasteEvent = useRef(false);

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

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
        partialTranscript: text,
      });
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
      await api(`/api/sessions/${sessionId}/answers`, {
        questionId: question.id,
        mode: "text",
        transcript: text,
        durationMs: shownAt.current ? Date.now() - shownAt.current : undefined,
        pasteDetected: pasted,
      });
      await onSubmitted();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  }

  function speak() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(question.text);
    u.lang = "en-IN";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            Question {question.number} of {total}
            {question.tier === "free" ? " · free" : ""}
          </span>
          <button
            type="button"
            onClick={speak}
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-stone-300 px-3 text-sm font-medium"
            aria-label="Read the question aloud"
          >
            <Volume2 className="size-4" /> Play
          </button>
        </div>
        <h2 className="text-xl font-semibold leading-snug">{question.text}</h2>
      </Card>

      {hints.map((h, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="flex flex-col gap-1">
            <p>{h}</p>
            {i === hints.length - 1 && <p className="text-sm text-amber-800">Give it another go.</p>}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <label htmlFor="answer" className="text-sm font-medium">
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
          className="rounded-2xl border border-stone-300 bg-white p-4 text-base leading-relaxed outline-none focus:border-stone-900"
        />
        <div className="flex justify-between text-xs text-stone-500">
          <span>{words > 0 && words < 40 ? "Aim for 60–150 words, like a real answer." : " "}</span>
          <span>{words} words</span>
        </div>
      </div>

      {hintError && <InlineError message={hintError} />}
      {submitError && <InlineError message={submitError} />}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={askHint}
          disabled={hintLoading || submitting}
          className="flex h-13 flex-1 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white font-semibold disabled:opacity-60"
        >
          {hintLoading ? <Loader2 className="size-5 animate-spin" /> : <Lightbulb className="size-5" />}
          {hintLoading ? "Thinking…" : "I'm stuck"}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || text.trim().length < 2}
          className="flex h-13 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-stone-900 font-semibold text-white disabled:opacity-40"
        >
          {submitting ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          {submitting ? "Saving…" : "Submit answer"}
        </button>
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
      <ErrorCard
        message={error}
        onRetry={async () => {
          setError(null);
          await run();
        }}
      />
    );
  }
  return (
    <Card>
      <Loader2 className="size-6 animate-spin text-orange-600" />
      <h2 className="text-lg font-semibold">Reviewing your answers…</h2>
      <p className="text-stone-600">Your interviewer is writing quick feedback. This takes about 15 seconds.</p>
    </Card>
  );
}

function FeedbackCard({ feedback, firstName }: { feedback: QuickFeedback; firstName: string }) {
  return (
    <Card>
      <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">Quick feedback</span>
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Nice work, {firstName}.</h2>
        <p className="text-right">
          <span className="text-3xl font-semibold">{feedback.overall_estimate}</span>
          <span className="text-stone-500">/100</span>
          <span className="block text-xs text-stone-500">early estimate</span>
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-emerald-700">What worked</h3>
        <p>{feedback.strength}</p>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-red-700">Fix these next</h3>
        <ol className="flex list-decimal flex-col gap-1 pl-5">
          {feedback.fixes.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function UpsellCard({ sessionId, pricePaise }: { sessionId: string; pricePaise: number }) {
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
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-orange-500 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-orange-600" />
        <h2 className="text-lg font-semibold">Unlock the full mock for ₹{rupees}</h2>
      </div>
      <ul className="flex flex-col gap-2 text-stone-700">
        {[
          "3 more questions, including a tougher round",
          "Full scorecard with quotes from your own answers",
          "Model-answer outlines for every question",
          "Human review for a verified Interview-Ready certificate",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={unlock}
        disabled={going}
        className="flex h-13 items-center justify-center gap-2 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700 disabled:opacity-70"
      >
        {going ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
        Unlock for ₹{rupees}
      </button>
      <p className="text-xs text-stone-500">
        A human reviews your interview before any certificate is issued. Review does not guarantee certification.
      </p>
    </section>
  );
}

function Progress({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`${answered} of ${total} answered`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < answered ? "bg-orange-600" : "bg-stone-200"}`} />
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">{children}</section>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center py-16">{children}</div>;
}

function InlineError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <Card>
      <p className="text-red-700">{message}</p>
      <button
        type="button"
        disabled={retrying}
        onClick={async () => {
          setRetrying(true);
          await onRetry();
          setRetrying(false);
        }}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 font-semibold text-white disabled:opacity-60"
      >
        {retrying ? <Loader2 className="size-5 animate-spin" /> : <RotateCcw className="size-5" />}
        Try again
      </button>
    </Card>
  );
}
