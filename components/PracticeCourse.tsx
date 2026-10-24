"use client";

import { BookOpen, ChevronDown, Mic, Sparkles } from "lucide-react";
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

  if (course) return <CourseView course={course} />;
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

function CourseView({ course }: { course: Course }) {
  return (
    <Sheet className="arrive flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ember-text">
          <BookOpen className="size-4" /> Your practice course · by {course.trainer}
        </span>
        <h2 className="font-serif text-[26px] leading-tight">{course.title}</h2>
        <p className="text-[15px] text-muted">{course.summary}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {course.lessons.map((lesson, i) => (
          <li key={i}>
            <details open={i === 0} className="group rounded-2xl ring-1 ring-line ring-inset">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold tabular-nums text-muted">
                  {i + 1}
                </span>
                <span className="flex-1 text-[16px] font-semibold leading-snug">{lesson.title}</span>
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <p className="text-[15px] leading-snug text-muted">{lesson.why}</p>
                <p className="font-serif text-[17px] leading-relaxed">{lesson.teach}</p>
                <div className="flex flex-col gap-1.5 rounded-xl bg-sunken p-3.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Example answer</h3>
                  <p className="font-serif text-[16px] leading-relaxed">{lesson.example}</p>
                </div>
                <p className="flex gap-2.5 text-[15px] leading-snug">
                  <Mic className="mt-0.5 size-4 shrink-0 text-ember-text" />
                  <span>
                    <span className="font-semibold">Practise out loud: </span>
                    {lesson.drill}
                  </span>
                </p>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
