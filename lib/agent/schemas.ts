import { z } from "zod";
import { wordCount } from "../signals";

export type AgentTask = "hint" | "quick_eval" | "followup" | "full_eval" | "course_plan";

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
