import { env } from "./env";

/** The trainer persona CourseCreatorAgent writes as; "Matt" in AgenticOrg. */
export const COURSE_TRAINER = {
  name: "Matt",
  style:
    "A friendly placement trainer who has coached hundreds of Indian freshers. Explains with simple, practical examples and keeps every step doable.",
};

/** Courses need CourseCreatorAgent, or the stub agent in development and CI. */
export function coursesEnabled(): boolean {
  const e = env();
  return e.AGENTICORG_MODE === "stub" || Boolean(e.AGENTICORG_COURSE_AGENT_ID);
}
