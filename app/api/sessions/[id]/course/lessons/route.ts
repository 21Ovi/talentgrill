import { z } from "zod";
import { query } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { handle, HttpError, isUuid, json, notFound, readJson } from "@/lib/http";
import { clientIp, take } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";

const Body = z.object({ lesson: z.number().int().min(1).max(6) });

// Marks one practice-course lesson as practised. Idempotent per lesson.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/course/lessons">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "course_lesson",
    async () => {
      const { lesson } = await readJson(req, Body);
      if (!take(`lesson:session:${id}`, 20, 1 / 5) || !take(`lesson:ip:${clientIp(req)}`, 200, 3)) {
        throw new HttpError(429, "Too many requests. Please wait a moment.");
      }
      const s = await loadSession(id);
      if (!s?.course) throw new HttpError(404, "Course not found.");
      const total = s.course.lessons.length;
      if (lesson > total) throw new HttpError(400, "That lesson isn't in this course.");
      if (s.course.completed.includes(lesson)) return json({ completed: s.course.completed });

      const [row] = await query<{ completed_lessons: number[] }>(
        `update courses
            set completed_lessons = array(select distinct unnest(completed_lessons || $2::smallint) order by 1)
          where session_id = $1
          returning completed_lessons`,
        [id, lesson],
      );
      const completed = row.completed_lessons;
      await logEvent({
        actor: "user",
        type: "course_lesson_completed",
        userId: s.userId,
        sessionId: id,
        payload: { lesson, title: s.course.lessons[lesson - 1]?.title, completed: completed.length, of: total },
      });
      if (completed.length === total) {
        await logEvent({ actor: "user", type: "course_completed", userId: s.userId, sessionId: id, payload: { trainer: s.course.trainer } });
      }
      return json({ completed });
    },
    { sessionId: id },
  );
}
