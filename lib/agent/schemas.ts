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
      }),
    )
    .length(3),
});
export type CoursePlanOutput = z.infer<typeof CoursePlanOutput>;
