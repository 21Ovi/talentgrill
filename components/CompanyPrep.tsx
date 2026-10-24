"use client";

import { Building2, Check, ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { LessonStep } from "@/components/PracticeCourse";
import { Button, Notice, Sheet } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { COMPANIES } from "@/lib/companies";
import { cue } from "@/lib/feedback";
import type { PublicState } from "@/lib/session";

type Prep = PublicState["companyPreps"][number];
type Plan = Prep["plan"];

/** Company-specific preparation guides, written by FresherCoachAgent once the candidate scores 80+. */
export function CompanyPrep({ sessionId, initial }: { sessionId: string; initial: Prep[] }) {
  const [preps, setPreps] = useState(initial);
  const [company, setCompany] = useState<string | null>(initial[0]?.company ?? null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = preps.find((p) => p.company === company);

  async function build() {
    if (!company) return;
    setBuilding(true);
    setError(null);
    try {
      const { prep } = await api<{ prep: Prep }>(`/api/sessions/${sessionId}/company-prep`, { company });
      setPreps((ps) => [...ps.filter((p) => p.company !== prep.company), prep]);
      cue("success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBuilding(false);
    }
  }

  return (
    <Sheet className="arrive flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ember-text">
          <Building2 className="size-4" /> Company prep · by FresherCoachAgent
        </span>
        <h2 className="font-serif text-[26px] leading-tight">Prepare for a specific company</h2>
        <p className="text-[15px] text-muted">
          Each guide covers how the company hires freshers, round by round: what to revise, likely questions, mistakes to
          avoid, resources and a practice test.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Company">
        {COMPANIES.map((c) => {
          const on = company === c;
          const ready = preps.some((p) => p.company === c);
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                cue("toggle");
                setCompany(c);
                setError(null);
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[15px] font-medium ring-1 ring-inset transition-colors ${
                on ? "bg-ink text-on-ink ring-ink" : "ring-line hover:bg-sunken"
              }`}
            >
              {ready && <Check className="size-3.5 stroke-[2.5]" />}
              {c}
            </button>
          );
        })}
      </div>
      {error && <Notice>{error}</Notice>}
      {company && !current && (
        <Button size="lg" className="w-full" onClick={build} loading={building}>
          {!building && <Sparkles className="size-[18px]" />}
          {building ? `Preparing your ${company} guide… about 30 seconds` : `Build my ${company} prep`}
        </Button>
      )}
      {current && <PrepView key={current.company} plan={current.plan} />}
    </Sheet>
  );
}

function PrepView({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState<number | "test" | null>(null);
  const total = plan.lessons.length;

  if (open === "test" && plan.final_test) return <PracticeTest questions={plan.final_test} onBack={() => setOpen(null)} />;
  if (typeof open === "number") {
    return (
      <LessonStep
        key={open}
        lesson={plan.lessons[open]}
        number={open + 1}
        total={total}
        trainer="FresherCoachAgent"
        done={false}
        saving={false}
        onBack={() => setOpen(null)}
        onDone={() => setOpen(open + 1 < total ? open + 1 : plan.final_test ? "test" : null)}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-[22px] leading-tight">{plan.title}</h3>
        <p className="text-[15px] text-muted">{plan.summary}</p>
      </div>
      <ol className="flex flex-col gap-2">
        {plan.lessons.map((l, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left ring-1 ring-line ring-inset transition-colors hover:bg-sunken"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold tabular-nums text-muted">
                {i + 1}
              </span>
              <span className="flex-1 text-[16px] font-semibold leading-snug">{l.title}</span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </button>
          </li>
        ))}
      </ol>
      {plan.final_test && (
        <Button variant="secondary" className="w-full" onClick={() => setOpen("test")}>
          <ClipboardCheck className="size-4" /> Practice test · {plan.final_test.length} questions
        </Button>
      )}
      <p className="text-sm text-muted">
        Based on commonly reported hiring processes. Check the company&apos;s careers page for current dates and rules.
      </p>
    </div>
  );
}

/** A self-graded practice test; nothing is stored. */
function PracticeTest({ questions, onBack }: { questions: NonNullable<Plan["final_test"]>; onBack: () => void }) {
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [checked, setChecked] = useState(false);
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  const unanswered = answers.filter((a) => a < 0).length;

  return (
    <div className="arrive flex flex-col gap-5">
      <button type="button" onClick={onBack} className="flex items-center gap-1 self-start text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All rounds
      </button>
      <h3 className="font-serif text-[22px] leading-tight">
        {checked ? `You got ${correct} of ${questions.length}` : `Practice test · ${questions.length} questions`}
      </h3>
      <ol className="flex flex-col gap-5">
        {questions.map((q, qi) => (
          <li key={qi} className="flex flex-col gap-2">
            <p className="text-[16px] font-medium leading-snug">
              {qi + 1}. {q.question}
            </p>
            {q.options.map((o, oi) => {
              const chosen = answers[qi] === oi;
              const state = checked ? (oi === q.answer ? "right" : chosen ? "wrong" : "idle") : chosen ? "chosen" : "idle";
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={checked}
                  aria-pressed={chosen}
                  onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                  className={`rounded-xl px-3.5 py-2.5 text-left text-[15px] ring-1 ring-inset transition-colors ${
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
            {checked && <p className="text-[15px] leading-snug text-muted">{q.explain}</p>}
          </li>
        ))}
      </ol>
      {checked ? (
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => {
            setChecked(false);
            setAnswers(questions.map(() => -1));
          }}
        >
          <RotateCcw className="size-[18px]" /> Try again
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          disabled={unanswered > 0}
          onClick={() => {
            setChecked(true);
            cue(correct === questions.length ? "success" : "tap");
          }}
        >
          <ClipboardCheck className="size-[18px]" />
          {unanswered > 0 ? `Answer ${unanswered} more to check` : "Check my answers"}
        </Button>
      )}
    </div>
  );
}
