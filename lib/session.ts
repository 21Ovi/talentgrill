import { CoursePlanOutput, QuickEvalOutput, ResumeProfile } from "./agent/schemas";
import { coursesEnabled, PASS_PERCENT } from "./course";
import { pool, type Queryable } from "./db";
import { env } from "./env";
import { FREE_QUESTIONS, PRO_QUESTIONS, ROLES, type RoleId } from "./roles";
import type { Rubric } from "./rubric";

export type Kind = "behavioral" | "situational" | "domain";
export type Tier = "free" | "pro";

export type SessionQuestion = {
  id: string;
  tier: Tier;
  position: number;
  kind: Kind;
  question_text: string;
  rubric: Rubric;
  answered: boolean;
};

export type Next = "answer" | "quick_eval" | "upsell" | "full_eval";

export type CompanyPrep = { company: string; plan: CoursePlanOutput };

export type Course = CoursePlanOutput & { trainer: string; completed: number[]; testScore: number | null };

export type LoadedSession = {
  id: string;
  userId: string;
  firstName: string;
  refCode: string;
  role: RoleId;
  roleLabel: string;
  status: string;
  isPro: boolean;
  quickFeedback: QuickEvalOutput | null;
  /** The practice course written from the quick feedback, once requested. */
  course: Course | null;
  /** Profile read from the optional resume, if one was uploaded. */
  resume: ResumeProfile | null;
  /** Company-specific guides, unlocked at 80+ on the final test or the interview. */
  companyPreps: CompanyPrep[];
  /** Free questions, plus pro questions once the session is Pro. */
  questions: SessionQuestion[];
  current: SessionQuestion | null;
  /** Hints already given for the current question, oldest first. */
  currentHints: string[];
  next: Next;
};

export async function loadSession(id: string, db: Queryable = pool()): Promise<LoadedSession | null> {
  const { rows } = await db.query<{
    id: string;
    role: RoleId;
    status: string;
    is_pro: boolean;
    quick_feedback: unknown;
    user_id: string;
    name: string;
    ref_code: string;
  }>(
    `select s.id, s.role, s.status, s.is_pro, s.quick_feedback, u.id as user_id, u.name, u.ref_code
       from sessions s join users u on u.id = s.user_id
      where s.id = $1`,
    [id],
  );
  const s = rows[0];
  if (!s) return null;

  const questions = (
    await db.query<SessionQuestion>(
      `select q.id, q.tier, q.position, q.kind, q.question_text, q.rubric,
              exists (select 1 from answers a where a.session_id = $1 and a.question_id = q.id) as answered
         from questions q
        where q.role = $2 and (q.tier = 'free' or $3)
        order by q.tier = 'pro', q.position`,
      [id, s.role, s.is_pro],
    )
  ).rows;

  const parsedFeedback = QuickEvalOutput.safeParse(s.quick_feedback);
  const quickFeedback = parsedFeedback.success ? parsedFeedback.data : null;

  const [courseRow] = (
    await db.query<{ trainer: string; plan: unknown; completed_lessons: number[]; test_score: number | null }>(
      "select trainer, plan, completed_lessons, test_score from courses where session_id = $1",
      [id],
    )
  ).rows;
  const [resumeRow] = (await db.query<{ profile: unknown }>("select profile from resumes where session_id = $1", [id])).rows;
  const parsedResume = resumeRow ? ResumeProfile.safeParse(resumeRow.profile) : null;
  const resume = parsedResume?.success ? parsedResume.data : null;

  const companyPreps = (
    await db.query<{ company: string; plan: unknown }>(
      "select company, plan from company_preps where session_id = $1 order by created_at",
      [id],
    )
  ).rows.flatMap((r) => {
    const plan = CoursePlanOutput.safeParse(r.plan);
    return plan.success ? [{ company: r.company, plan: plan.data }] : [];
  });

  const parsedCourse = courseRow ? CoursePlanOutput.safeParse(courseRow.plan) : null;
  const course = parsedCourse?.success
    ? {
        ...parsedCourse.data,
        trainer: courseRow.trainer,
        completed: courseRow.completed_lessons,
        testScore: courseRow.test_score,
      }
    : null;

  const nextFree = questions.find((q) => q.tier === "free" && !q.answered) ?? null;
  const nextPro = questions.find((q) => q.tier === "pro" && !q.answered) ?? null;
  let current: SessionQuestion | null = null;
  let next: Next;
  if (nextFree) [current, next] = [nextFree, "answer"];
  else if (!quickFeedback) next = "quick_eval";
  else if (!s.is_pro) next = "upsell";
  else if (nextPro) [current, next] = [nextPro, "answer"];
  else next = "full_eval";

  const currentHints = current
    ? (
        await db.query<{ hint: string }>(
          `select output->>'hint' as hint from agent_runs
            where session_id = $1 and task = 'hint' and status = 'SUCCEEDED' and input->>'question_id' = $2
            order by created_at`,
          [id, current.id],
        )
      ).rows.map((r) => r.hint)
    : [];

  return {
    id: s.id,
    userId: s.user_id,
    firstName: s.name.split(/\s+/)[0] ?? s.name,
    refCode: s.ref_code,
    role: s.role,
    roleLabel: ROLES.find((r) => r.id === s.role)?.label ?? s.role,
    status: s.status,
    isPro: s.is_pro,
    quickFeedback,
    course,
    companyPreps,
    resume,
    questions,
    current,
    currentHints,
    next,
  };
}

/** What the browser may see: no rubrics, no pro questions before payment. */
export function publicState(s: LoadedSession) {
  const total = s.isPro ? FREE_QUESTIONS + PRO_QUESTIONS : FREE_QUESTIONS;
  return {
    session: { id: s.id, role: s.role, roleLabel: s.roleLabel, status: s.status, isPro: s.isPro },
    user: { firstName: s.firstName },
    progress: { answered: s.questions.filter((q) => q.answered).length, total },
    current: s.current && {
      id: s.current.id,
      tier: s.current.tier,
      kind: s.current.kind,
      text: s.current.question_text,
      number: s.questions.indexOf(s.current) + 1,
      hints: s.currentHints,
    },
    next: s.next,
    quickFeedback: s.quickFeedback,
    course: s.course && publicCourse(s.course),
    coursesEnabled: coursesEnabled(),
    companyPreps: s.companyPreps,
    resume: s.resume,
    companyPrepUnlocked: companyPrepUnlocked(s),
    pricePaise: env().PRO_PRICE_PAISE,
    paymentsEnabled: env().PAYMENTS_ENABLED,
    liveInterview: env().LIVE_INTERVIEW_ENABLED,
    /** Free questions still open: what a live call would cover. */
    liveQuestions: s.questions.filter((q) => q.tier === "free" && !q.answered).length,
  };
}

/** Company prep opens at 80+ on the course's final test or the interview itself. */
export function companyPrepUnlocked(s: LoadedSession): boolean {
  return (s.course?.testScore ?? 0) >= PASS_PERCENT || (s.quickFeedback?.overall_estimate ?? 0) >= PASS_PERCENT;
}

/** The final test's answers stay on the server until it is graded. */
export function publicCourse(c: Course) {
  return { ...c, final_test: c.final_test?.map(({ question, options }) => ({ question, options })) };
}

export type PublicState = ReturnType<typeof publicState>;
