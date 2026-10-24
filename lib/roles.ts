// Plain module (no path aliases) so scripts/ can import it too.

export const ROLES = [
  { id: "ai-ml-engineer", label: "AI/ML Engineer", domain: "Tech" },
  { id: "software-engineer", label: "Software Engineer", domain: "Tech" },
  { id: "cloud-engineer", label: "Cloud Engineer", domain: "Tech" },
  { id: "cybersecurity-analyst", label: "Cybersecurity Analyst", domain: "Tech" },
  { id: "data-engineer", label: "Data Engineer", domain: "Tech" },
  { id: "frontend-developer", label: "Frontend Developer", domain: "Tech" },
  { id: "business-analyst", label: "Business Analyst", domain: "Management & Finance" },
  { id: "sales-hr-associate", label: "Sales & HR Associate", domain: "Sales & HR" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export const FREE_QUESTIONS = 2;
export const PRO_QUESTIONS = 3;
