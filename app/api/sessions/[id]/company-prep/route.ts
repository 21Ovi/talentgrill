import { z } from "zod";
import { runAgent } from "@/lib/agent/run";
import { FullCoursePlanOutput } from "@/lib/agent/schemas";
import { COMPANIES, companyPrepInstructions, coursesEnabled } from "@/lib/course";
import { query } from "@/lib/db";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound, readJson } from "@/lib/http";
import { clientIp, take } from "@/lib/rateLimit";
import { RESUME_CONTEXT_NOTE, resumeBrief } from "@/lib/resume";
import { companyPrepUnlocked, loadSession } from "@/lib/session";

const Body = z.object({ company: z.enum(COMPANIES, { error: "Pick a company from the list." }) });

// Double taps for the same company share one agent run.
const inFlight = new Map<string, Promise<Response>>();

// Writes a company-specific preparation guide with FresherCoachAgent, once the
// candidate has 80+ on the course's final test or the interview.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/company-prep">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "company_prep",
    async () => {
      const { company } = await readJson(req, Body);
      const key = `${id}:${company}`;
      const pending = inFlight.get(key);
      if (pending) return (await pending).clone();
      const work = buildPrep(req, id, company);
      inFlight.set(key, work);
      try {
        return (await work).clone();
      } finally {
        inFlight.delete(key);
      }
    },
    { sessionId: id },
  );
}

async function buildPrep(req: Request, id: string, company: (typeof COMPANIES)[number]): Promise<Response> {
  const s = await loadSession(id);
  if (!s) throw new HttpError(404, "Session not found.");
  const existing = s.companyPreps.find((p) => p.company === company);
  if (existing) return json({ prep: existing });
  if (!companyPrepUnlocked(s)) throw new HttpError(403, "Score 80% on the final test to unlock company prep.");
  if (!coursesEnabled()) throw new HttpError(503, "Company prep is off right now.");
  if (!take(`company:session:${id}`, 4, 1 / 120) || !take(`company:ip:${clientIp(req)}`, 60, 1)) {
    throw new HttpError(429, "Too many attempts. Please wait a minute and try again.");
  }

  await logEvent({
    actor: "user",
    type: "company_prep_requested",
    userId: s.userId,
    sessionId: id,
    payload: { company, ...requestMeta(req) },
  });
  const result = await runAgent({
    task: "company_prep",
    sessionId: id,
    userId: s.userId,
    schema: FullCoursePlanOutput,
    input: {
      role: s.roleLabel,
      company,
      interview_score: s.quickFeedback?.overall_estimate ?? null,
      test_score: s.course?.testScore ?? null,
      strength: s.quickFeedback?.strength ?? null,
      fixes: s.quickFeedback?.fixes ?? [],
      ...(s.resume ? { resume: resumeBrief(s.resume), resume_note: RESUME_CONTEXT_NOTE } : {}),
      instructions: companyPrepInstructions(company),
    },
  });
  if (!result.ok) {
    return json({ error: `Couldn't prepare your ${company} guide. Please try again.`, retry: true }, 502);
  }

  const [saved] = await query<{ id: string }>(
    `insert into company_preps (session_id, company, agent_run_id, plan) values ($1, $2, $3, $4)
     on conflict (session_id, company) do nothing returning id`,
    [id, company, result.runId, JSON.stringify(result.output)],
  );
  if (saved) {
    await logEvent({
      actor: "agent",
      type: "company_prep_generated",
      userId: s.userId,
      sessionId: id,
      payload: { company, company_prep_id: saved.id, agent_run_id: result.runId, title: result.output.title },
    });
  }
  return json({ prep: { company, plan: result.output } });
}
