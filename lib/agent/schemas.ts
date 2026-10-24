import { z } from "zod";
import { wordCount } from "../signals";

export type AgentTask = "hint" | "quick_eval" | "followup" | "full_eval";

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
