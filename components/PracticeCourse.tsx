"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  Lock,
  Mic,
  PartyPopper,
  Play,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  TriangleAlert,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button, Notice, Sheet } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";
import type { PublicState } from "@/lib/session";

type Course = NonNullable<PublicState["course"]>;

/** A short practice course, written by the trainer agent from this interview's feedback. */
export function PracticeCourse({ sessionId, initial }: { sessionId: string; initial: Course | null }) {
  const [course, setCourse] = useState(initial);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    setWriting(true);
    setError(null);
    try {
      const res = await api<{ course: Course }>(`/api/sessions/${sessionId}/course`, {});
      setCourse(res.course);
      cue("success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWriting(false);
    }
  }

  if (course) return <CourseView sessionId={sessionId} course={course} onChange={setCourse} />;
  return (
    <section className="arrive flex flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Turn this into a practice course</h2>
        <p className="text-[15px] text-muted">
          Matt, your trainer, writes lessons from your own answers, with key takeaways, mistakes to avoid, quizzes,
          resources and a final test. Score 80% to unlock company prep.
        </p>
      </div>
      {error && <Notice>{error}</Notice>}
      <Button size="lg" className="w-full" onClick={build} loading={writing}>
        {!writing && <Sparkles className="size-[18px]" />}
        {writing ? "Matt is writing your course…" : "Build my practice course"}
      </Button>
    </section>
  );
}

const PASS_PERCENT = 80;

type Lesson = Course["lessons"][number];
type QuizQ = NonNullable<Lesson["quiz"]>;
type TestResult = {
  score: number;
  best: number;
  correct: number;
  total: number;
  passed: boolean;
  results: { correct: boolean; answer: number; explain: string }[];
};

function CourseView({ sessionId, course, onChange }: { sessionId: string; course: Course; onChange: (c: Course) => void }) {
  // A lesson index, the final test, or null for the overview.
  const [open, setOpen] = useState<number | "test" | null>(null);
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = course.lessons.length;
  const isDone = (i: number) => course.completed.includes(i + 1);
  const next = course.lessons.findIndex((_, i) => !isDone(i));
  const full = course.lessons.some((l) => Array.isArray(l.key_points));
  const passed = (course.testScore ?? 0) >= PASS_PERCENT;

  async function complete(i: number) {
    setSaving(true);
    setError(null);
    try {
      const { completed } = await api<{ completed: number[] }>(`/api/sessions/${sessionId}/course/lessons`, { lesson: i + 1 });
      onChange({ ...course, completed });
      cue(completed.length === total ? "success" : "tap");
      const after = course.lessons.findIndex((_, j) => !completed.includes(j + 1));
      setOpen(after === -1 ? (course.final_test ? "test" : null) : after);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function upgrade() {
    setUpgrading(true);
    setError(null);
    try {
      const res = await api<{ course: Course }>(`/api/sessions/${sessionId}/course?upgrade=1`, {});
      onChange(res.course);
      setOpen(null);
      cue("success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <Sheet className="arrive flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ember-text">
          <BookOpen className="size-4" /> Your practice course · by {course.trainer}
        </span>
        <h2 className="font-serif text-[26px] leading-tight">{course.title}</h2>
        {open === null && <p className="text-[15px] text-muted">{course.summary}</p>}
      </div>
      <Tracker done={course.completed.length} total={total} testScore={course.testScore} hasTest={Boolean(course.final_test)} />
      {error && <Notice>{error}</Notice>}

      {open === "test" && course.final_test ? (
        <FinalTest
          sessionId={sessionId}
          questions={course.final_test}
          onBack={() => setOpen(null)}
          onScored={(best) => onChange({ ...course, testScore: best })}
        />
      ) : open !== null && open !== "test" ? (
        <LessonStep
          key={open}
          lesson={course.lessons[open]}
          number={open + 1}
          total={total}
          trainer={course.trainer}
          done={isDone(open)}
          saving={saving}
          onBack={() => setOpen(null)}
          onDone={() => complete(open)}
        />
      ) : (
        <>
          <ol className="flex flex-col gap-2">
            {course.lessons.map((lesson, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left ring-1 ring-line ring-inset transition-colors hover:bg-sunken"
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${isDone(i) ? "bg-ok/15 text-ok" : i === next ? "bg-ember/15 text-ember-text" : "bg-sunken text-muted"}`}
                  >
                    {isDone(i) ? <Check className="size-4 stroke-[2.5]" /> : i + 1}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-[16px] font-semibold leading-snug">{lesson.title}</span>
                    <span className="text-sm text-muted">{isDone(i) ? "Practised" : i === next ? "Up next" : "Not started"}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </button>
              </li>
            ))}
            {course.final_test && (
              <li>
                <button
                  type="button"
                  onClick={() => setOpen("test")}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left ring-1 ring-line ring-inset transition-colors hover:bg-sunken"
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full ${passed ? "bg-ok/15 text-ok" : "bg-ember/15 text-ember-text"}`}
                  >
                    {passed ? <Trophy className="size-4" /> : <ClipboardCheck className="size-4" />}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-[16px] font-semibold leading-snug">Final test</span>
                    <span className="text-sm text-muted">
                      {course.final_test.length} questions ·{" "}
                      {course.testScore === null ? `score ${PASS_PERCENT}% to pass` : `best score ${course.testScore}%`}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </button>
              </li>
            )}
          </ol>

          {next !== -1 ? (
            <Button size="lg" className="w-full" onClick={() => setOpen(next)}>
              <Play className="size-[18px]" />
              {course.completed.length === 0 ? "Start course" : `Continue with lesson ${next + 1}`}
            </Button>
          ) : course.final_test && !passed ? (
            <Button size="lg" className="w-full" onClick={() => setOpen("test")}>
              <ClipboardCheck className="size-[18px]" />
              {course.testScore === null ? "Take the final test" : "Retake the final test"}
            </Button>
          ) : (
            <p className="flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-[15px] font-medium text-ok">
              <PartyPopper className="size-4 shrink-0" /> Course complete. Take another interview to see the difference.
            </p>
          )}

          {!full && (
            <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-4">
              <p className="text-[15px] leading-snug">
                <span className="font-semibold">Get the full course.</span> Rebuild it with key takeaways, mistakes to
                avoid, quizzes, resources and a final test. Your lesson progress restarts.
              </p>
              <Button variant="secondary" onClick={upgrade} loading={upgrading}>
                {!upgrading && <Sparkles className="size-4" />}
                {upgrading ? "Matt is rebuilding your course…" : "Get the full course"}
              </Button>
            </div>
          )}
          <NextLevel unlocked={passed} hasTest={Boolean(course.final_test)} />
        </>
      )}
    </Sheet>
  );
}

function Tracker({ done, total, testScore, hasTest }: { done: number; total: number; testScore: number | null; hasTest: boolean }) {
  // The final test counts as one more step once it is passed.
  const steps = total + (hasTest ? 1 : 0);
  const finished = done + (hasTest && (testScore ?? 0) >= PASS_PERCENT ? 1 : 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {done} of {total} lessons practised{hasTest && testScore !== null ? ` · test ${testScore}%` : ""}
        </span>
        <span className="tabular-nums text-muted">{Math.round((finished / steps) * 100)}%</span>
      </div>
      <div className="flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={steps} aria-valuenow={finished} aria-label="Course progress">
        {Array.from({ length: steps }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
            <span
              className={`block h-full origin-left rounded-full bg-ember transition-[scale] duration-500 ease-spring ${i < finished ? "scale-x-100" : "scale-x-0"}`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      {children}
    </section>
  );
}

function resourceUrl(r: { query: string; kind: "video" | "article" }): string {
  const q = encodeURIComponent(r.query);
  return r.kind === "video" ? `https://www.youtube.com/results?search_query=${q}` : `https://www.google.com/search?q=${q}`;
}

function LessonStep(props: {
  lesson: Lesson;
  number: number;
  total: number;
  trainer: string;
  done: boolean;
  saving: boolean;
  onBack: () => void;
  onDone: () => void;
}) {
  const { lesson, number, total, trainer, done, saving, onBack, onDone } = props;
  return (
    <div className="arrive flex flex-col gap-5">
      <button type="button" onClick={onBack} className="flex items-center gap-1 self-start text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All lessons
      </button>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ember-text">
          Lesson {number} of {total}
        </span>
        <h3 className="font-serif text-[24px] leading-tight">{lesson.title}</h3>
        <p className="text-[15px] leading-snug text-muted">{lesson.why}</p>
      </div>
      <p className="font-serif text-[17px] leading-relaxed">{lesson.teach}</p>

      {lesson.key_points && (
        <Section title="Key takeaways">
          <ul className="flex flex-col gap-2">
            {lesson.key_points.map((k, i) => (
              <li key={i} className="flex gap-2.5 text-[16px] leading-snug">
                <Check className="mt-1 size-4 shrink-0 stroke-[2.5] text-ok" />
                {k}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex flex-col gap-1.5 rounded-xl bg-sunken p-3.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Sample answer</h4>
        <p className="font-serif text-[16px] leading-relaxed">{lesson.example}</p>
        <p className="text-xs text-muted">Written by {trainer} to show the structure. It isn&apos;t your answer.</p>
      </div>

      {lesson.mistakes && (
        <Section title="Mistakes to avoid">
          <ul className="flex flex-col gap-2">
            {lesson.mistakes.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-[16px] leading-snug">
                <TriangleAlert className="mt-1 size-4 shrink-0 text-ember-text" />
                {m}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {lesson.quiz && (
        <Section title="Quick check">
          <QuickCheck quiz={lesson.quiz} />
        </Section>
      )}

      {lesson.resources && lesson.resources.length > 0 && (
        <Section title="Learn more">
          <ul className="flex flex-col gap-1.5">
            {lesson.resources.map((r, i) => (
              <li key={i}>
                <a
                  href={resourceUrl(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] ring-1 ring-line ring-inset transition-colors hover:bg-sunken"
                >
                  {r.kind === "video" ? (
                    <PlayCircle className="size-4 shrink-0 text-ember-text" />
                  ) : (
                    <BookOpen className="size-4 shrink-0 text-ember-text" />
                  )}
                  <span className="flex-1">{r.title}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted" />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex flex-col gap-1.5 rounded-xl p-3.5 ring-1 ring-ember/40 ring-inset">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ember-text">
          <Mic className="size-4" /> Your turn
        </h4>
        <p className="text-[16px] leading-snug">{lesson.drill}</p>
        <p className="text-sm text-muted">Say your answer out loud in under two minutes, then mark it practised.</p>
      </div>
      {done ? (
        <Button size="lg" variant="secondary" className="w-full" onClick={onBack}>
          <Check className="size-[18px]" /> Practised · back to all lessons
        </Button>
      ) : (
        <Button size="lg" className="w-full" onClick={onDone} loading={saving}>
          {!saving && (number === total ? <Check className="size-[18px]" /> : <ArrowRight className="size-[18px]" />)}
          {number === total ? "I've practised this · finish lessons" : "I've practised this · next lesson"}
        </Button>
      )}
    </div>
  );
}

/** A one-question check with instant feedback; answers are in the lesson itself. */
function QuickCheck({ quiz }: { quiz: QuizQ }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[16px] font-medium leading-snug">{quiz.question}</p>
      {quiz.options.map((o, i) => {
        const state = picked === null ? "idle" : i === quiz.answer ? "right" : i === picked ? "wrong" : "idle";
        return (
          <button
            key={i}
            type="button"
            disabled={picked !== null}
            onClick={() => {
              setPicked(i);
              cue(i === quiz.answer ? "success" : "error");
            }}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[15px] ring-1 ring-inset transition-colors ${
              state === "right" ? "bg-ok/10 text-ok ring-ok/40" : state === "wrong" ? "bg-danger/10 text-danger ring-danger/40" : "ring-line hover:bg-sunken"
            }`}
          >
            {state === "right" ? <Check className="size-4 shrink-0" /> : state === "wrong" ? <X className="size-4 shrink-0" /> : null}
            {o}
          </button>
        );
      })}
      {picked !== null && (
        <p className="text-[15px] leading-snug text-muted">
          {picked === quiz.answer ? "Correct. " : "Not quite. "}
          {quiz.explain}
        </p>
      )}
    </div>
  );
}

function FinalTest(props: {
  sessionId: string;
  questions: { question: string; options: string[] }[];
  onBack: () => void;
  onScored: (best: number) => void;
}) {
  const { sessionId, questions, onBack, onScored } = props;
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<TestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unanswered = answers.filter((a) => a < 0).length;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<TestResult>(`/api/sessions/${sessionId}/course/test`, { answers });
      setResult(res);
      onScored(res.best);
      cue(res.passed ? "success" : "error");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="arrive flex flex-col gap-5">
      <button type="button" onClick={onBack} className="flex items-center gap-1 self-start text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All lessons
      </button>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ember-text">Final test</span>
        <h3 className="font-serif text-[24px] leading-tight">
          {result ? `You scored ${result.score}%` : `${questions.length} questions · ${PASS_PERCENT}% to pass`}
        </h3>
        {result && (
          <p className={`text-[15px] font-medium ${result.passed ? "text-ok" : "text-muted"}`}>
            {result.correct} of {result.total} correct.{" "}
            {result.passed ? "Passed: company prep is unlocked." : `Review the lessons and try again to reach ${PASS_PERCENT}%.`}
          </p>
        )}
      </div>
      <ol className="flex flex-col gap-5">
        {questions.map((q, qi) => {
          const r = result?.results[qi];
          return (
            <li key={qi} className="flex flex-col gap-2">
              <p className="text-[16px] font-medium leading-snug">
                {qi + 1}. {q.question}
              </p>
              {q.options.map((o, oi) => {
                const chosen = answers[qi] === oi;
                const state = r ? (oi === r.answer ? "right" : chosen ? "wrong" : "idle") : chosen ? "chosen" : "idle";
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={Boolean(result)}
                    onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    aria-pressed={chosen}
                    className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[15px] ring-1 ring-inset transition-colors ${
                      state === "right"
                        ? "bg-ok/10 text-ok ring-ok/40"
                        : state === "wrong"
                          ? "bg-danger/10 text-danger ring-danger/40"
                          : state === "chosen"
                            ? "bg-ink text-on-ink ring-ink"
                            : "ring-line hover:bg-sunken"
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
              {r && <p className="text-[15px] leading-snug text-muted">{r.explain}</p>}
            </li>
          );
        })}
      </ol>
      {error && <Notice>{error}</Notice>}
      {result ? (
        <Button
          size="lg"
          variant="secondary"
          className="w-full"
          onClick={() => {
            setResult(null);
            setAnswers(questions.map(() => -1));
          }}
        >
          <RotateCcw className="size-[18px]" /> Retake the test
        </Button>
      ) : (
        <Button size="lg" className="w-full" onClick={submit} loading={submitting} disabled={unanswered > 0}>
          {!submitting && <ClipboardCheck className="size-[18px]" />}
          {unanswered > 0 ? `Answer ${unanswered} more to submit` : "Submit test"}
        </Button>
      )}
    </div>
  );
}

/** What comes after the course: company-specific prep, unlocked at 80% on the final test. */
function NextLevel({ unlocked, hasTest }: { unlocked: boolean; hasTest: boolean }) {
  if (!hasTest) return null;
  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl p-4 ${unlocked ? "bg-ok/10" : "bg-sunken"}`}>
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        {unlocked ? <Trophy className="size-4 text-ok" /> : <Lock className="size-4 text-muted" />}
        Next level: company prep
      </p>
      <p className="text-[15px] leading-snug text-muted">
        {unlocked
          ? "You passed. Prepare for a specific company's rounds, topics and likely questions below."
          : `Score ${PASS_PERCENT}% or more on the final test to unlock preparation for specific companies like TCS, Infosys, Accenture and Amazon.`}
      </p>
    </div>
  );
}
