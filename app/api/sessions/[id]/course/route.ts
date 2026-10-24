import { runAgent } from "@/lib/agent/run";
import { FullCoursePlanOutput } from "@/lib/agent/schemas";
import { COURSE_FORMAT, COURSE_TRAINER, coursesEnabled, isFullCourse } from "@/lib/course";
import { query } from "@/lib/db";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound } from "@/lib/http";
import { clientIp, take } from "@/lib/rateLimit";
import { RESUME_CONTEXT_NOTE, resumeBrief } from "@/lib/resume";
import { loadSession, publicCourse } from "@/lib/session";

// Double taps share one agent run per session, like quick feedback.
const inFlight = new Map<string, Promise<Response>>();

// Writes a practice course from the session's quick feedback and answers with
// CourseCreatorAgent. One course per session; asking again returns it.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/course">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const pending = inFlight.get(id);
  if (pending) return (await pending).clone();

  const work = handle("course", () => buildCourse(req, id), { sessionId: id });
  inFlight.set(id, work);
  try {
    return (await work).clone();
  } finally {
    inFlight.delete(id);
  }
}

async function buildCourse(req: Request, id: string): Promise<Response> {
  const s = await loadSession(id);
  if (!s) throw new HttpError(404, "Session not found.");
  // An older course can be rebuilt once in the fuller format (?upgrade=1).
  const upgrade = new URL(req.url).searchParams.get("upgrade") === "1" && s.course !== null && !isFullCourse(s.course);
  if (s.course && !upgrade) return json({ course: publicCourse(s.course) });
  if (!s.quickFeedback) throw new HttpError(409, "Finish the interview and get your feedback first.");
  if (!coursesEnabled()) throw new HttpError(503, "Practice courses are off right now.");
  if (!take(`course:session:${id}`, 3, 1 / 120) || !take(`course:ip:${clientIp(req)}`, 60, 1)) {
    throw new HttpError(429, "Too many attempts. Please wait a minute and try again.");
  }

  await logEvent({
    actor: "user",
    type: "course_requested",
    userId: s.userId,
    sessionId: id,
    payload: { trainer: COURSE_TRAINER.name, upgrade, ...requestMeta(req) },
  });

  const answers = await query<{ question_text: string; kind: string; transcript: string; hints_used: number }>(
    `select q.question_text, q.kind, a.transcript, a.hints_used
       from answers a join questions q on q.id = a.question_id
      where a.session_id = $1 and q.tier = 'free'
      order by q.position`,
    [id],
  );

  const result = await runAgent({
    task: "course_plan",
    sessionId: id,
    userId: s.userId,
    schema: FullCoursePlanOutput,
    input: {
      role: s.roleLabel,
      trainer: COURSE_TRAINER,
      course_format: COURSE_FORMAT,
      ...(s.resume ? { resume: resumeBrief(s.resume), resume_note: RESUME_CONTEXT_NOTE } : {}),
      overall_estimate: s.quickFeedback.overall_estimate,
      strength: s.quickFeedback.strength,
      fixes: s.quickFeedback.fixes,
      answers: answers.map((a) => ({
        question: a.question_text,
        kind: a.kind,
        transcript: a.transcript,
        hints_used: a.hints_used,
      })),
    },
  });
  if (!result.ok) {
    return json({ error: "Couldn't write your course. Please try again.", retry: true }, 502);
  }

  const [saved] = await query<{ id: string }>(
    upgrade
      ? `update courses set agent_run_id = $2, trainer = $3, plan = $4, completed_lessons = '{}'
          where session_id = $1 returning id`
      : `insert into courses (session_id, agent_run_id, trainer, plan) values ($1, $2, $3, $4)
         on conflict (session_id) do nothing returning id`,
    [id, result.runId, COURSE_TRAINER.name, JSON.stringify(result.output)],
  );
  if (saved) {
    await logEvent({
      actor: "agent",
      type: upgrade ? "course_upgraded" : "course_generated",
      userId: s.userId,
      sessionId: id,
      payload: {
        course_id: saved.id,
        agent_run_id: result.runId,
        trainer: COURSE_TRAINER.name,
        title: result.output.title,
        lessons: result.output.lessons.map((l) => l.title),
      },
    });
  }
  const after = await loadSession(id);
  const course = after?.course ?? { ...result.output, trainer: COURSE_TRAINER.name, completed: [], testScore: null };
  return json({ course: publicCourse(course) });
}
