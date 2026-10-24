import { z } from "zod";
import { wordCount } from "../signals";

export type AgentTask = "hint" | "quick_eval" | "followup" | "full_eval" | "course_plan" | "company_prep" | "resume_read" | "resume_question";

export const HintOutput = z.object({
  hint: z
    .string()
    .trim()
    .min(3)
    .refine((s) => wordCount(s) <= 40, "hint must be at most 40 words"),
});
export type HintOutput = z.infer<typeof HintOutput>;

export const QuickEvalOutput = z.object({
  overall_estimate: z.number().int().min(0).max(100),
  strength: z.string().trim().min(3).max(400),
  fixes: z.array(z.string().trim().min(3).max(400)).length(2),
});
export type QuickEvalOutput = z.infer<typeof QuickEvalOutput>;

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

const Quiz = z
  .object({
    question: text(5, 300),
    options: z.array(text(1, 200)).min(3).max(4),
    answer: z.number().int().min(0).max(3),
    explain: text(3, 400),
  })
  .refine((q) => q.answer < q.options.length, "quiz.answer must be the index of one of the options");

export const CoursePlanOutput = z.object({
  title: text(3, 80),
  summary: text(3, 300),
  lessons: z
    .array(
      z.object({
        title: text(3, 80),
        why: text(3, 400),
        teach: text(20, 1500),
        example: text(10, 1000),
        drill: text(5, 300),
        // Added in the fuller course format; older courses don't have them.
        key_points: z.array(text(3, 200)).min(2).max(6).optional(),
        mistakes: z.array(text(3, 300)).min(1).max(4).optional(),
        quiz: Quiz.optional(),
        // Search topics, turned into YouTube/Google links by the app (never raw URLs).
        resources: z
          .array(z.object({ title: text(3, 120), query: text(3, 120), kind: z.enum(["video", "article"]).catch("article") }))
          .max(4)
          .optional(),
      }),
    )
    .min(3)
    .max(6),
  final_test: z.array(Quiz).min(3).max(8).optional(),
});
export type CoursePlanOutput = z.infer<typeof CoursePlanOutput>;

/** What a newly written course must contain; saved courses load with CoursePlanOutput. */
export const FullCoursePlanOutput = CoursePlanOutput.extend({
  lessons: z
    .array(
      CoursePlanOutput.shape.lessons.element.required({ key_points: true, mistakes: true, quiz: true, resources: true }),
    )
    .min(3)
    .max(6),
  final_test: z.array(Quiz).min(3).max(8),
});

const short = (max: number) => z.string().trim().max(max);

export const ResumeProfile = z.object({
  headline: text(3, 200),
  education: z.array(z.object({ degree: short(120), institution: short(160), year: short(20).catch("") })).max(5).catch([]),
  skills: z.array(text(1, 60)).max(20).catch([]),
  projects: z
    .array(z.object({ name: text(1, 120), summary: short(400), tech: z.array(text(1, 40)).max(8).catch([]) }))
    .max(6)
    .catch([]),
  experience: z.array(z.object({ role: short(120), organization: short(160), summary: short(400) })).max(6).catch([]),
  achievements: z.array(text(1, 200)).max(6).catch([]),
  talking_points: z.array(text(3, 300)).max(6).catch([]),
  gaps: z.array(text(3, 300)).max(4).catch([]),
});
export type ResumeProfile = z.infer<typeof ResumeProfile>;

const Levels = z.object({ one: text(3, 300), three: text(3, 300), five: text(3, 300) });

/** A main interview question written from the resume, with its rubric parts. */
export const ResumeQuestionOutput = z.object({
  kind: z.enum(["behavioral", "situational", "domain"]),
  text: text(10, 300),
  domain_accuracy: Levels,
  problem_solving: Levels,
  key_points: z.array(text(3, 200)).min(3).max(6),
});
export type ResumeQuestionOutput = z.infer<typeof ResumeQuestionOutput>;
