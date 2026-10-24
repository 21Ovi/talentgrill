import { runAgent } from "@/lib/agent/run";
import { ResumeProfile } from "@/lib/agent/schemas";
import { query } from "@/lib/db";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound } from "@/lib/http";
import { clientIp, take } from "@/lib/rateLimit";
import { readResume, RESUME_INSTRUCTIONS } from "@/lib/resume";
import { loadSession } from "@/lib/session";

// Optional resume before the interview: the text goes to ResumeReaderAgent and
// only the structured profile is kept.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/resume">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "resume",
    async () => {
      if (!take(`resume:session:${id}`, 4, 1 / 60) || !take(`resume:ip:${clientIp(req)}`, 60, 1)) {
        throw new HttpError(429, "Too many uploads. Please wait a minute and try again.");
      }
      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      if (s.questions.some((q) => q.answered)) throw new HttpError(409, "Add your resume before the interview starts.");

      const form = await req.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File)) throw new HttpError(400, "Choose a PDF or .txt file to upload.");
      let resume;
      try {
        resume = await readResume(file);
      } catch (err) {
        throw new HttpError(400, err instanceof Error ? err.message : "We couldn't read that file.");
      }

      await logEvent({
        actor: "user",
        type: "resume_uploaded",
        userId: s.userId,
        sessionId: id,
        payload: { file_type: resume.type, bytes: file.size, chars: resume.text.length, ...requestMeta(req) },
      });
      const result = await runAgent({
        task: "resume_read",
        sessionId: id,
        userId: s.userId,
        schema: ResumeProfile,
        input: { role: s.roleLabel, resume_text: resume.text, instructions: RESUME_INSTRUCTIONS },
        storedInput: { role: s.roleLabel, file_type: resume.type, chars: resume.text.length },
      });
      if (!result.ok) return json({ error: "Couldn't read your resume. Try again, or start without it.", retry: true }, 502);
      if (result.output.headline === "Not a resume") {
        throw new HttpError(422, "That doesn't look like a resume. Try another file, or start without it.");
      }

      const [saved] = await query<{ id: string }>(
        `insert into resumes (session_id, agent_run_id, file_type, chars, profile) values ($1, $2, $3, $4, $5)
         on conflict (session_id) do update
           set agent_run_id = excluded.agent_run_id, file_type = excluded.file_type,
               chars = excluded.chars, profile = excluded.profile, created_at = now()
         returning id`,
        [id, result.runId, resume.type, resume.text.length, JSON.stringify(result.output)],
      );
      await logEvent({
        actor: "agent",
        type: "resume_read",
        userId: s.userId,
        sessionId: id,
        payload: {
          resume_id: saved.id,
          agent_run_id: result.runId,
          skills: result.output.skills.length,
          projects: result.output.projects.length,
          experience: result.output.experience.length,
        },
      });
      return json({ resume: result.output });
    },
    { sessionId: id },
  );
}
