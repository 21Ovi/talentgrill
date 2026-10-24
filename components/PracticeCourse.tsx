"use client";

import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Mic, PartyPopper, Play, Sparkles } from "lucide-react";
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
          Matt, your trainer, writes three short lessons from your own answers, each with a question to practise out
          loud. About 15 minutes.
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

function CourseView({ sessionId, course, onChange }: { sessionId: string; course: Course; onChange: (c: Course) => void }) {
  // The lesson being read, or null for the overview.
  const [open, setOpen] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = course.lessons.length;
  const isDone = (i: number) => course.completed.includes(i + 1);
  const next = course.lessons.findIndex((_, i) => !isDone(i));

  async function complete(i: number) {
    setSaving(true);
    setError(null);
    try {
      const { completed } = await api<{ completed: number[] }>(`/api/sessions/${sessionId}/course/lessons`, { lesson: i + 1 });
      onChange({ ...course, completed });
      cue(completed.length === total ? "success" : "tap");
      const after = course.lessons.findIndex((_, j) => !completed.includes(j + 1));
      setOpen(after === -1 ? null : after);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
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
      <Tracker done={course.completed.length} total={total} />
      {error && <Notice>{error}</Notice>}

      {open === null ? (
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
          </ol>
          {next === -1 ? (
            <p className="flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-[15px] font-medium text-ok">
              <PartyPopper className="size-4 shrink-0" /> Course complete. Take another interview to see the difference.
            </p>
          ) : (
            <Button size="lg" className="w-full" onClick={() => setOpen(next)}>
              <Play className="size-[18px]" />
              {course.completed.length === 0 ? "Start course" : `Continue with lesson ${next + 1}`}
            </Button>
          )}
        </>
      ) : (
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
      )}
    </Sheet>
  );
}

function Tracker({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {done} of {total} lessons practised
        </span>
        <span className="tabular-nums text-muted">{Math.round((done / total) * 100)}%</span>
      </div>
      <div className="flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Lessons practised">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
            <span
              className={`block h-full origin-left rounded-full bg-ember transition-[scale] duration-500 ease-spring ${i < done ? "scale-x-100" : "scale-x-0"}`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

type Lesson = Course["lessons"][number];

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
    <div className="arrive flex flex-col gap-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 self-start text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All lessons
      </button>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ember-text">
          Lesson {number} of {total}
        </span>
        <h3 className="font-serif text-[24px] leading-tight">{lesson.title}</h3>
      </div>
      <p className="text-[15px] leading-snug text-muted">{lesson.why}</p>
      <p className="font-serif text-[17px] leading-relaxed">{lesson.teach}</p>
      <div className="flex flex-col gap-1.5 rounded-xl bg-sunken p-3.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Sample answer</h4>
        <p className="font-serif text-[16px] leading-relaxed">{lesson.example}</p>
        <p className="text-xs text-muted">Written by {trainer} to show the structure. It isn&apos;t your answer.</p>
      </div>
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
          {number === total ? "I've practised this · finish" : "I've practised this · next lesson"}
        </Button>
      )}
    </div>
  );
}
