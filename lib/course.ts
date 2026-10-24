import { env } from "./env";

/** The trainer persona CourseCreatorAgent writes as; "Matt" in AgenticOrg. */
export const COURSE_TRAINER = {
  name: "Matt",
  style:
    "A friendly placement trainer who has coached hundreds of Indian freshers. Explains with simple, practical examples and keeps every step doable.",
};

/**
 * Sent with each course request so Matt writes the fuller format without a
 * prompt change: 5 lessons with takeaways, mistakes, a quiz and resources, plus a final test.
 */
export const COURSE_FORMAT = {
  version: 2,
  instructions:
    "This overrides the lesson count and lesson shape in your instructions. Write exactly 5 lessons: 1) fixes[0], 2) fixes[1], 3) builds on the strength, 4) the core concept behind the questions asked, one level deeper than they answered, 5) an interview skill for this role (structuring answers, thinking aloud, asking clarifying questions). Each lesson keeps title, why, teach, example and drill, and adds: key_points (3 to 5 short takeaways), mistakes (2 or 3 common mistakes to avoid), quiz ({question, options: 4 short options, answer: index 0-3 of the correct option, explain: one sentence on why}), and resources (2 or 3 items {title, query, kind: video or article}: a search query for a well-known free tutorial or doc on this topic; never a URL). Also add a top-level final_test: 5 multiple-choice questions across all lessons, each {question, options: 4, answer: index 0-3, explain: one sentence}, testing understanding rather than memory. Reply with the same JSON object shape plus these fields.",
};

/** Score (percent) on the final test that unlocks company preparation. */
export const PASS_PERCENT = 80;

/** True when a course was written in the fuller format. */
export function isFullCourse(course: { lessons: { key_points?: unknown }[] }): boolean {
  return course.lessons.some((l) => Array.isArray(l.key_points));
}

/** Courses need CourseCreatorAgent, or the stub agent in development and CI. */
export function coursesEnabled(): boolean {
  const e = env();
  return e.AGENTICORG_MODE === "stub" || Boolean(e.AGENTICORG_COURSE_AGENT_ID);
}
