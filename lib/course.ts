import { env } from "./env";
export { COMPANIES } from "./companies";

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


/** Instructions for FresherCoachAgent's company_prep task (course-shaped reply). */
export function companyPrepInstructions(company: string): string {
  return `Write a COMPANY PREPARATION course for a fresher applying to ${company} for this role. Exactly 5 lessons, one per stage of how ${company} commonly hires freshers (e.g. the hiring process overview, aptitude/reasoning or online assessment, technical concepts, coding, HR/managerial), titled with the company name where natural. In each lesson: why = what this stage checks; teach = how to prepare for it (80 to 140 words); example = a strong sample answer to a question commonly asked at this stage; drill = one likely question to practise out loud; key_points = 3 to 5 topics to revise; mistakes = 2 or 3 common mistakes candidates make here; quiz = {question, options: 4, answer: index 0-3, explain}; resources = 2 or 3 {title, query, kind: video or article} (search queries, never URLs). Also a top-level final_test: 5 questions {question, options: 4, answer, explain} on this preparation. title = short course title naming the company; summary = one sentence. Base it on commonly reported hiring processes; never invent dates, cut-offs, salaries or exam names you are unsure of. Reply with ONE JSON object: {title, summary, lessons: [{title, why, teach, example, drill, key_points, mistakes, quiz, resources}], final_test}.`;
}

/** True when a course was written in the fuller format. */
export function isFullCourse(course: { lessons: { key_points?: unknown }[] }): boolean {
  return course.lessons.some((l) => Array.isArray(l.key_points));
}

/** Courses need CourseCreatorAgent, or the stub agent in development and CI. */
export function coursesEnabled(): boolean {
  const e = env();
  return e.AGENTICORG_MODE === "stub" || Boolean(e.AGENTICORG_COURSE_AGENT_ID);
}
