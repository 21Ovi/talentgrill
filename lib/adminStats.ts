// Read-only numbers for /admin. Counts use the same rule as the landing-page
// counter: internal numbers and self-declared event staff are left out.

import { query } from "./db";
import { ROLES } from "./roles";

const REAL_USER = "not u.is_internal and not u.is_event_staff";
const TODAY_IST = "(date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')";

export type Range = "today" | "all";

export type Funnel = {
  started: number;
  answeredOne: number;
  answeredTwo: number;
  feedback: number;
  upsell: number;
  paid: number;
};

export type Breakdown = { label: string; today: number; total: number }[];

export type RecentSignup = {
  name: string;
  phone: string;
  role: string;
  source: string;
  createdAt: string;
  excluded: "staff" | "internal" | null;
  referred: boolean;
  answers: number;
  feedback: boolean;
};

export type AdminStats = {
  signupsToday: number;
  signupsTotal: number;
  referred: number;
  excluded: number;
  funnel: Funnel;
  sources: Breakdown;
  roles: Breakdown;
  recent: RecentSignup[];
};

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.label]));

/** "+919876543210" → "+91 98•••••210": enough to recognise a test signup, not to call anyone. */
export function maskPhone(phone: string): string {
  const local = phone.replace(/^\+91/, "");
  return `+91 ${local.slice(0, 2)}${"•".repeat(Math.max(0, local.length - 5))}${local.slice(-3)}`;
}

/** First name and last initial only. */
function shortName(name: string): string {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}

export async function loadAdminStats(range: Range): Promise<AdminStats> {
  const [totals, funnel, sources, roles, recent] = await Promise.all([
    query<{ today: number; total: number; referred: number; excluded: number }>(
      `select count(*) filter (where ${REAL_USER} and u.created_at >= ${TODAY_IST})::int as today,
              count(*) filter (where ${REAL_USER})::int as total,
              count(*) filter (where ${REAL_USER} and u.referred_by is not null)::int as referred,
              count(*) filter (where not (${REAL_USER}))::int as excluded
         from users u`,
    ),
    query<Funnel>(
      `with s as (
         select s.quick_feedback is not null as feedback,
                (select count(*) from answers a where a.session_id = s.id) as answers,
                exists (select 1 from events e where e.session_id = s.id and e.type = 'upsell_clicked') as upsell,
                exists (select 1 from payments p where p.session_id = s.id and p.status = 'SUCCESS' and p.env = 'live') as paid
           from sessions s join users u on u.id = s.user_id
          where ${REAL_USER} and ($1::text = 'all' or s.created_at >= ${TODAY_IST})
       )
       select count(*)::int as "started",
              count(*) filter (where answers >= 1)::int as "answeredOne",
              count(*) filter (where answers >= 2)::int as "answeredTwo",
              count(*) filter (where feedback)::int as "feedback",
              count(*) filter (where upsell)::int as "upsell",
              count(*) filter (where paid)::int as "paid"
         from s`,
      [range],
    ),
    breakdown("coalesce(nullif(u.source, ''), 'direct')"),
    breakdown("u.role_target"),
    query<{
      name: string;
      phone: string;
      role_target: string;
      source: string;
      created_at: Date;
      is_internal: boolean;
      is_event_staff: boolean;
      referred: boolean;
      answers: number;
      feedback: boolean;
    }>(
      `select u.name, u.phone, u.role_target, coalesce(nullif(u.source, ''), 'direct') as source, u.created_at,
              u.is_internal, u.is_event_staff, u.referred_by is not null as referred,
              (select count(*) from answers a join sessions s on s.id = a.session_id where s.user_id = u.id)::int as answers,
              exists (select 1 from sessions s where s.user_id = u.id and s.quick_feedback is not null) as feedback
         from users u
        order by u.created_at desc
        limit 25`,
    ),
  ]);

  return {
    signupsToday: totals[0].today,
    signupsTotal: totals[0].total,
    referred: totals[0].referred,
    excluded: totals[0].excluded,
    funnel: funnel[0],
    sources,
    roles: roles.map((r) => ({ ...r, label: ROLE_LABEL[r.label] ?? r.label })),
    recent: recent.map((r) => ({
      name: shortName(r.name),
      phone: maskPhone(r.phone),
      role: ROLE_LABEL[r.role_target] ?? r.role_target,
      source: r.source,
      createdAt: r.created_at.toISOString(),
      excluded: r.is_internal ? "internal" : r.is_event_staff ? "staff" : null,
      referred: r.referred,
      answers: r.answers,
      feedback: r.feedback,
    })),
  };
}

/** Signups today and in total, grouped by one users column. `expr` is fixed SQL from this file. */
async function breakdown(expr: string): Promise<Breakdown> {
  return query<{ label: string; today: number; total: number }>(
    `select ${expr} as label,
            count(*) filter (where u.created_at >= ${TODAY_IST})::int as today,
            count(*)::int as total
       from users u
      where ${REAL_USER}
      group by 1
      order by total desc, label`,
  );
}
