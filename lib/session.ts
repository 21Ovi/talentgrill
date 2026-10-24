import { QuickEvalOutput } from "./agent/schemas";
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
    pricePaise: env().PRO_PRICE_PAISE,
  };
}

export type PublicState = ReturnType<typeof publicState>;
