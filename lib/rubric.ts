// Plain module (no path aliases) so scripts/ can import it too.

export const DIMENSIONS = [
  "structure",
  "domain_accuracy",
  "problem_solving",
  "communication",
  "role_fit",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

/** What a score of 1, 3 and 5 looks like; 2 and 4 sit between. */
export type Descriptors = { "1": string; "3": string; "5": string };

export type Rubric = {
  dimensions: { dimension: Dimension; weight: number; descriptors: Descriptors }[];
  /** Points a strong answer covers. Grounds hints and model-answer outlines. */
  key_points: string[];
};
