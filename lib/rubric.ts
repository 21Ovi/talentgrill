// Plain module (no path aliases) so scripts/ can import it too.
import type { RoleId } from "./roles.ts";

export type QuestionKind = "behavioral" | "situational" | "domain";

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

export type Spec = {
  kind: QuestionKind;
  text: string;
  domain_accuracy: Descriptors;
  problem_solving: Descriptors;
  key_points: string[];
};

export const d = (one: string, three: string, five: string): Descriptors => ({ "1": one, "3": three, "5": five });

const WEIGHTS: Record<QuestionKind, Record<Dimension, number>> = {
  behavioral: { structure: 0.25, domain_accuracy: 0.15, problem_solving: 0.2, communication: 0.25, role_fit: 0.15 },
  situational: { structure: 0.2, domain_accuracy: 0.2, problem_solving: 0.3, communication: 0.15, role_fit: 0.15 },
  domain: { structure: 0.15, domain_accuracy: 0.35, problem_solving: 0.2, communication: 0.15, role_fit: 0.15 },
};

const STRUCTURE: Record<QuestionKind, Descriptors> = {
  behavioral: d(
    "Rambling; no clear situation, action or result.",
    "Has a situation and actions, but the result or learning is vague.",
    "Clear STAR: situation, task, their own actions, a measurable result and what they learned.",
  ),
  situational: d(
    "No clear approach; jumps around.",
    "Some order, but misses steps or never reaches a conclusion.",
    "States the approach up front, works through it step by step and ends with a clear recommendation.",
  ),
  domain: d(
    "Disorganised or circular explanation.",
    "Mostly logical, but key points are buried.",
    "Defines the concept, explains it in a logical order and gives an example.",
  ),
};

const COMMUNICATION = d(
  "Hard to follow: very short, off-topic or full of filler.",
  "Understandable but wordy, or uses jargon without explaining it.",
  "Concise and confident, in plain language a non-expert could follow.",
);

const ROLE_FIT: Record<RoleId, Descriptors> = {
  "ai-ml-engineer": d(
    "No sign of thinking about data, evaluation or users.",
    "Some ML awareness, but treats it as an academic exercise.",
    "Connects technical choices to data quality, evaluation and real-world impact, like a working ML engineer.",
  ),
  "software-engineer": d(
    "No sign of engineering thinking.",
    "Technically aware but ignores trade-offs or users.",
    "Thinks about correctness, edge cases, users and trade-offs, like a working engineer.",
  ),
  "business-analyst": d(
    "No business or data thinking.",
    "Some analysis, but not tied to a business decision.",
    "Structured, data-driven and focused on the business decision and its impact.",
  ),
  "sales-hr-associate": d(
    "Self-focused; ignores the other person.",
    "Friendly but generic; little sense of the business goal.",
    "Empathetic and persuasive: listens first and keeps both the person and the business goal in view.",
  ),
  "cloud-engineer": d(
    "Treats the cloud as someone else's computer to click around in, with no thought for security, cost or what happens when something fails.",
    "Knows the core services and gives sensible answers, but only thinks about least privilege, cost or designing for failure when prompted.",
    "Weighs security, failure and cost together without being asked: least privilege by default, no single points of failure, logs before changes, and owns problems openly with the team.",
  ),
  "cybersecurity-analyst": d(
    "Treats security as tools and buzzwords, and jumps to drastic actions without evidence, escalation or regard for ethics.",
    "Knows the core concepts and sensible steps but doesn't consistently verify with logs, follow a process or think about business impact.",
    "Thinks in evidence and risk: checks logs before acting, contains then escalates and documents, stays within legal and ethical limits, and explains clearly to non-technical people.",
  ),
  "data-engineer": d(
    "Talks only about tool names or textbook definitions and never thinks about whether the data is correct or who uses it.",
    "Understands pipelines and SQL and checks their own output, but rarely thinks about re-runs, monitoring or downstream users.",
    "Treats data as a product: builds pipelines that are safe to re-run, validates data at each step, keeps the analysts and dashboards that depend on it in mind, and communicates clearly when something breaks.",
  ),
  "frontend-developer": d(
    "Talks only about the code they write, with no thought for real users, devices or browsers.",
    "Gives correct technical answers but rarely considers users on slow phones, other browsers, keyboards or screen readers.",
    "Thinks from the user's screen outward: tests on real devices and browsers, measures before optimising, builds for accessibility and keeps the team informed.",
  ),
};

export function buildRubric(role: RoleId, spec: Spec): Rubric {
  const descriptors: Record<Dimension, Descriptors> = {
    structure: STRUCTURE[spec.kind],
    domain_accuracy: spec.domain_accuracy,
    problem_solving: spec.problem_solving,
    communication: COMMUNICATION,
    role_fit: ROLE_FIT[role],
  };
  const weights = WEIGHTS[spec.kind];
  return {
    dimensions: (Object.keys(descriptors) as Dimension[]).map((dimension) => ({
      dimension,
      weight: weights[dimension],
      descriptors: descriptors[dimension],
    })),
    key_points: spec.key_points,
  };
}
