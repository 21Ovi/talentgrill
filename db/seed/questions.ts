// Question bank: 5 per role (2 free, 3 pro), Indian campus-placement fresher level.
// Structure, communication and role_fit descriptors are shared; domain_accuracy
// and problem_solving are written per question.
import { ROLES, type RoleId } from "../../lib/roles.ts";
import type { Descriptors, Dimension, Rubric } from "../../lib/rubric.ts";

type Kind = "behavioral" | "situational" | "domain";
type Tier = "free" | "pro";

export type SeedQuestion = {
  role: RoleId;
  domain: string;
  kind: Kind;
  tier: Tier;
  position: number;
  question_text: string;
  rubric: Rubric;
};

type Spec = {
  kind: Kind;
  text: string;
  domain_accuracy: Descriptors;
  problem_solving: Descriptors;
  key_points: string[];
};

const d = (one: string, three: string, five: string): Descriptors => ({ "1": one, "3": three, "5": five });

const WEIGHTS: Record<Kind, Record<Dimension, number>> = {
  behavioral: { structure: 0.25, domain_accuracy: 0.15, problem_solving: 0.2, communication: 0.25, role_fit: 0.15 },
  situational: { structure: 0.2, domain_accuracy: 0.2, problem_solving: 0.3, communication: 0.15, role_fit: 0.15 },
  domain: { structure: 0.15, domain_accuracy: 0.35, problem_solving: 0.2, communication: 0.15, role_fit: 0.15 },
};

const STRUCTURE: Record<Kind, Descriptors> = {
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
};

const BANK: Record<RoleId, { free: [Spec, Spec]; pro: [Spec, Spec, Spec] }> = {
  "ai-ml-engineer": {
    free: [
      {
        kind: "situational",
        text: "Your model shows 95% accuracy, but the business team says it's useless. What might be going on?",
        domain_accuracy: d(
          "Takes 95% at face value or blames the business team.",
          "Spots one real cause, such as class imbalance or the wrong metric, without explaining it.",
          "Explains class imbalance and why precision, recall or a business metric matters, and raises other causes like data leakage or drift between training and real data.",
        ),
        problem_solving: d(
          "Jumps straight to 'add more data' or 'use a bigger model'.",
          "Lists possible causes but not how to check them.",
          "Forms hypotheses and says how to test each: confusion matrix, error analysis, asking the business what a costly mistake looks like.",
        ),
        key_points: [
          "Accuracy misleads on imbalanced data (e.g. 95% of cases are 'not fraud')",
          "Choose metrics that match the business cost: precision, recall, F1, cost of a missed case",
          "Check for data leakage and drift between training and production data",
          "Ask the business what decision the model is meant to support",
          "Look at the confusion matrix and real failure examples",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a project, from college, an internship or your own, where your model or data didn't behave the way you expected. What did you do?",
        domain_accuracy: d(
          "No technical detail; the problem could be anything.",
          "Names the issue (overfitting, noisy labels, missing values) with some detail.",
          "Diagnoses the issue precisely, explains its technical cause and the fix, and backs it with a before-and-after number.",
        ),
        problem_solving: d(
          "Gave up, or someone else fixed it.",
          "Tried things, mostly by trial and error.",
          "Debugged methodically: checked the data first, isolated the cause, changed one thing at a time.",
        ),
        key_points: [
          "A concrete project with a clear goal",
          "What exactly went wrong and how they noticed",
          "Their own debugging steps, starting with the data",
          "A measured result after the fix",
          "What they would do differently next time",
        ],
      },
    ],
    pro: [
      {
        kind: "domain",
        text: "Explain overfitting to a non-technical manager. Then tell me two ways you would reduce it.",
        domain_accuracy: d(
          "Wrong or confused definition, e.g. mixes it up with underfitting.",
          "Correct definition and one valid fix.",
          "Correct definition with a simple analogy, plus two or more valid fixes: more data, regularisation, a simpler model, early stopping, dropout.",
        ),
        problem_solving: d(
          "Lists fixes without knowing when to use them.",
          "Picks fixes but doesn't say how to tell whether they worked.",
          "Explains how to detect overfitting (gap between training and validation scores) and how to confirm the fix worked.",
        ),
        key_points: [
          "Overfitting means memorising the training data instead of learning patterns that generalise",
          "Analogy: a student who memorises past papers but fails new questions",
          "Detect it: high training score, much lower validation score",
          "Fixes: more or augmented data, regularisation, a simpler model, early stopping, dropout",
          "Confirm with cross-validation on held-out data",
        ],
      },
      {
        kind: "situational",
        text: "You've built a customer-support chatbot on an LLM, and it sometimes makes up refund policies. How would you fix this before launch?",
        domain_accuracy: d(
          "Only suggests 'use a better model' or 'tell it not to lie'.",
          "Mentions one real technique, such as retrieval (RAG) or tighter prompts.",
          "Grounds answers in the real policy documents (RAG), restricts it to retrieved sources, adds guardrails or a refusal when unsure, and builds an evaluation set.",
        ),
        problem_solving: d(
          "No way to measure whether the fix worked.",
          "Proposes testing in general terms.",
          "Defines how to measure made-up answers (test questions, human review), sets a bar for launch, and hands risky cases like refunds to a human.",
        ),
        key_points: [
          "Ground answers in the official policy documents (retrieval / RAG)",
          "Instruct it to answer only from sources and say 'I don't know' otherwise",
          "Guardrails: block or escalate any refund promise",
          "Build a test set of tricky questions and measure how often it makes things up",
          "Hand risky cases to a human agent and monitor after launch",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a time you had to learn a new tool or technique quickly to finish something. How did you go about it?",
        domain_accuracy: d(
          "Can't say what they learned or why it was needed.",
          "Names the tool and roughly what they built with it.",
          "Explains the tool clearly, why it was the right choice and what they built with it, at the right depth.",
        ),
        problem_solving: d(
          "No learning strategy beyond 'watched YouTube'.",
          "Some strategy, like docs and tutorials, without prioritising.",
          "Learned deliberately: focused on what the task needed, built a small prototype first, asked for help at the right time.",
        ),
        key_points: [
          "The deadline or reason it had to be fast",
          "How they decided what to learn first",
          "A small working prototype before the full thing",
          "The result and how they knew it worked",
          "How they approach new tools now",
        ],
      },
    ],
  },

  "software-engineer": {
    free: [
      {
        kind: "domain",
        text: "What happens between typing a URL in the browser and seeing the page?",
        domain_accuracy: d(
          "Only 'the browser loads the website', or major errors.",
          "Covers DNS, an HTTP request and the server's response, with gaps.",
          "Covers DNS lookup, TCP and TLS connection, HTTP request, server processing, response, and the browser parsing HTML, loading CSS and JS and rendering, using correct terms.",
        ),
        problem_solving: d(
          "Lists random terms in no order.",
          "Correct order but no depth on any step.",
          "Clear sequence, and confidently goes deeper on one or two steps such as caching, CDNs or HTTPS.",
        ),
        key_points: [
          "DNS resolves the domain to an IP address, with caching at several levels",
          "TCP connection, plus a TLS handshake for HTTPS",
          "HTTP request; a server or CDN processes it and returns a response",
          "The browser parses HTML, fetches CSS, JS and images, builds the DOM and renders",
          "Caching and CDNs make repeat visits faster",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a bug that took you a long time to fix. How did you finally find it?",
        domain_accuracy: d(
          "No technical detail about the bug.",
          "Describes the bug and the fix at a basic level.",
          "Explains the root cause precisely and why the fix works, using correct technical terms.",
        ),
        problem_solving: d(
          "Made random changes until it worked.",
          "Some systematic steps, like logging or a debugger.",
          "Reproduced it reliably, narrowed it down (logs, debugger, bisecting), found the root cause and added a test so it can't come back.",
        ),
        key_points: [
          "What the bug was and why it mattered",
          "Reproducing it reliably",
          "Narrowing it down: logs, debugger, removing code, git bisect",
          "The root cause, not just the symptom",
          "A test or check added afterwards",
        ],
      },
    ],
    pro: [
      {
        kind: "situational",
        text: "Your college fest's registration site crashes every time results are announced. How would you figure out why and fix it?",
        domain_accuracy: d(
          "No grasp of load, servers or databases.",
          "Identifies the traffic spike as the cause, with one generic fix like 'add more servers'.",
          "Considers several bottlenecks (slow database queries, connection limits, no caching, a single server) and matches a fix to each: caching, a static results page, indexes, a queue, scaling out.",
        ),
        problem_solving: d(
          "Guesses a fix without checking anything.",
          "Suggests checking logs but has no clear plan.",
          "Gathers evidence first (logs, metrics, a load test), finds the actual bottleneck, fixes it and load-tests before the next announcement.",
        ),
        key_points: [
          "A traffic spike at a known time: thousands of students refreshing together",
          "Find the bottleneck with logs, metrics and a load test",
          "Common culprits: slow database queries, connection limits, no caching",
          "Fixes: serve results as a cached or static page, add indexes, rate-limit, scale out",
          "Load-test before the next announcement",
        ],
      },
      {
        kind: "domain",
        text: "What is the difference between a process and a thread? Give an example where using threads could cause a bug.",
        domain_accuracy: d(
          "Wrong or confused definitions.",
          "Correct basic difference (threads share memory, processes don't) but a weak example.",
          "Correct difference covering memory, overhead and isolation, plus a clear race-condition example and how to prevent it (locks, atomic operations).",
        ),
        problem_solving: d(
          "Can't connect the concept to a real bug.",
          "Gives an example but not why it fails.",
          "Explains exactly how the interleaving causes the bug and how to prevent it.",
        ),
        key_points: [
          "A process has its own memory; threads inside a process share it",
          "Threads are cheaper to create and switch, but less isolated",
          "Race condition: two threads update a shared counter or balance at the same time",
          "Prevent it with locks or mutexes, atomic operations, or by avoiding shared state",
          "Deadlocks are a risk that comes with locking",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a time you disagreed with a teammate about how to build something. What happened?",
        domain_accuracy: d(
          "No technical substance to the disagreement.",
          "Describes both approaches at a basic level.",
          "Explains the technical trade-off between the two approaches clearly and fairly.",
        ),
        problem_solving: d(
          "Gave in, or forced their way without reasons.",
          "Discussed it, but the decision wasn't based on evidence.",
          "Settled it with evidence (a quick prototype, data, a senior's input) and kept the working relationship strong.",
        ),
        key_points: [
          "The project and the two competing approaches",
          "Understood the teammate's reasoning first",
          "Used evidence to decide: a prototype, benchmark or agreed criteria",
          "The outcome and what the team shipped",
          "What they learned about working with others",
        ],
      },
    ],
  },

  "business-analyst": {
    free: [
      {
        kind: "situational",
        text: "Sales fell 20% in one region last month. How would you find out why?",
        domain_accuracy: d(
          "Uses no business or data concepts.",
          "Looks at some data (by product, by store) but misses obvious angles.",
          "Breaks the drop down systematically by product, channel, customer segment, and price versus volume, and checks external factors (competitors, season, supply) and data errors.",
        ),
        problem_solving: d(
          "Jumps to one cause without evidence.",
          "Lists causes but no order or method for testing them.",
          "Structured: confirms the data is right, compares with other regions and last year, drills down, forms hypotheses, checks with the sales team and recommends an action.",
        ),
        key_points: [
          "First confirm the drop is real, not a data or reporting error",
          "Compare with other regions and the same month last year (seasonality)",
          "Break it down by product, channel, customer, and price versus volume",
          "Check internal causes (stock-outs, sales team changes, pricing) and external ones (a competitor, local events)",
          "Talk to the regional team, then recommend a fix",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a time you used data to change someone's mind.",
        domain_accuracy: d(
          "No real data or analysis involved.",
          "Used some numbers, but basic or loosely tied to the decision.",
          "Clear analysis with the right data, explaining what it showed and why it was reliable.",
        ),
        problem_solving: d(
          "Presented numbers and hoped for the best.",
          "Sound analysis, but didn't consider the other person's view.",
          "Understood what the other person cared about, framed the data around it and handled objections.",
        ),
        key_points: [
          "What decision was at stake and who needed convincing",
          "What data they gathered and how",
          "The key insight, stated simply",
          "How they presented it to fit that person's concerns",
          "The outcome and its impact",
        ],
      },
    ],
    pro: [
      {
        kind: "domain",
        text: "A company's revenue is growing, but it is running out of cash. How is that possible?",
        domain_accuracy: d(
          "Confuses revenue, profit and cash.",
          "Says profit isn't cash, with one valid reason.",
          "Explains several causes: customers paying late (receivables), inventory piling up, heavy capital spending, debt repayments, selling at a loss to grow, and links them to the cash flow statement.",
        ),
        problem_solving: d(
          "No idea what to check.",
          "Suggests looking at the financial statements in general.",
          "Says exactly what to check (receivable days, inventory days, payable days, capex, burn rate) and suggests fixes.",
        ),
        key_points: [
          "Revenue and profit are not cash",
          "Customers paying late, so receivables pile up",
          "Cash locked in inventory, or heavy capital spending for growth",
          "Selling at a loss, or spending heavily on customer acquisition, to grow",
          "Check the cash flow statement and working-capital cycle; fixes include faster collections and better credit terms",
        ],
      },
      {
        kind: "domain",
        text: "Estimate how many cups of chai are sold in Bengaluru in a day. Walk me through your thinking.",
        domain_accuracy: d(
          "A random number with no basis.",
          "Uses population but few segments; some assumptions are unrealistic.",
          "Starts from a sensible population (about 1.3 to 1.4 crore), segments by who drinks chai and how often, separates cups made at home from cups bought, and keeps assumptions realistic.",
        ),
        problem_solving: d(
          "No method, or a single wild guess.",
          "Has a method but doesn't check whether the answer is sensible.",
          "Clear stated assumptions, simple maths done out loud, and a sanity check from the supply side (tea stalls times cups per stall).",
        ),
        key_points: [
          "State the population: about 1.3 to 1.4 crore",
          "Segment: share who drink chai, cups per day, share bought outside home",
          "Do the multiplication out loud with round numbers",
          "Cross-check from the supply side: number of tea stalls times cups each",
          "Give a final range and name the assumption that matters most",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a time you had to deliver results with incomplete information or a tight deadline.",
        domain_accuracy: d(
          "No real analysis or business content.",
          "Some relevant work, but the method is unclear.",
          "Clear about what information was missing, what they assumed and how they checked those assumptions.",
        ),
        problem_solving: d(
          "Panicked, missed the deadline or hid the gaps.",
          "Got it done, but without prioritising.",
          "Prioritised what mattered most, stated assumptions openly, flagged risks early and delivered.",
        ),
        key_points: [
          "The deadline and what information was missing",
          "What they prioritised and what they dropped",
          "Assumptions they made and shared with others",
          "The result delivered on time",
          "What they would do differently",
        ],
      },
    ],
  },

  "sales-hr-associate": {
    free: [
      {
        kind: "situational",
        text: "A customer says your product is too expensive. What do you say?",
        domain_accuracy: d(
          "Immediately offers a discount or argues.",
          "Explains the value but doesn't ask questions first.",
          "Asks questions to understand the objection ('expensive compared with what?'), reframes on value and return, and uses discounts only as a last, conditional option.",
        ),
        problem_solving: d(
          "Has one scripted response.",
          "Handles the objection but doesn't move towards a next step.",
          "Finds the real objection (budget, perceived value, a competitor), tailors the response and closes with a clear next step.",
        ),
        key_points: [
          "Acknowledge the concern; don't argue",
          "Ask 'expensive compared with what?' to find the real objection",
          "Reframe on value: savings, results, the cost of not buying",
          "Offer options (a smaller plan, payment terms) before discounts",
          "Close with a clear next step",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a time you convinced someone to say yes to something they were unsure about.",
        domain_accuracy: d(
          "No real persuasion; they just asked again.",
          "Some persuasion, mostly pushing their own view.",
          "Understood the person's concern, addressed it with evidence or a benefit to them, and earned a genuine yes.",
        ),
        problem_solving: d(
          "No approach; got lucky.",
          "An approach, but a generic one.",
          "Adapted the approach to the person and handled their objection directly.",
        ),
        key_points: [
          "Who they were convincing and why it mattered",
          "The person's real hesitation",
          "How they addressed it: listening, evidence, a benefit to the other person",
          "The outcome",
          "What they learned about persuading people",
        ],
      },
    ],
    pro: [
      {
        kind: "situational",
        text: "A new joiner in your team says they want to quit in their first month. What would you do?",
        domain_accuracy: d(
          "Lets them go, or just tries to talk them out of it.",
          "Has a conversation, but shows little HR understanding (onboarding, fit with the manager).",
          "Holds a private, empathetic conversation to find the real reason (role mismatch, manager, workload, pay, personal), and understands onboarding and why people leave early.",
        ),
        problem_solving: d(
          "No plan beyond one chat.",
          "Suggests a fix but doesn't involve the manager or follow up.",
          "Clear plan: listen, fix what's fixable with the manager, agree a check-in date, let them go respectfully if it's a true mismatch, and improve onboarding for the next joiner.",
        ),
        key_points: [
          "Listen privately and without judgement",
          "Find the root cause: role mismatch, manager, workload, culture, pay or personal reasons",
          "Fix what's fixable with the manager and set a follow-up date",
          "If it's a true mismatch, let them leave respectfully",
          "Improve onboarding so it doesn't happen again",
        ],
      },
      {
        kind: "domain",
        text: "What questions would you ask a customer in the first five minutes of a sales call, and why?",
        domain_accuracy: d(
          "No questions; jumps straight into a pitch.",
          "Asks some generic questions.",
          "Asks open, purposeful questions about needs, the current solution, pain points, the decision-maker, budget and timeline, and explains why each matters.",
        ),
        problem_solving: d(
          "Questions don't lead anywhere.",
          "Useful questions, but not tied to the next step.",
          "Uses the answers to qualify the customer and decide what to pitch next.",
        ),
        key_points: [
          "Build rapport and set the agenda",
          "Discovery: their goals, current solution and what isn't working",
          "Qualify: decision-maker, budget, timeline",
          "Listen more than talk, and follow up on what they say",
          "Use the answers to tailor the pitch and agree a next step",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a time you dealt with a difficult person: a customer, classmate or colleague. How did you handle it?",
        domain_accuracy: d(
          "Blames the other person entirely.",
          "Handled it reasonably, but without a clear technique.",
          "Shows clear people skills: stays calm, listens, finds the underlying need and sets boundaries where needed.",
        ),
        problem_solving: d(
          "Avoided the situation or escalated straight away.",
          "Partly resolved it.",
          "Resolved it in a way that worked for both sides and kept the relationship.",
        ),
        key_points: [
          "The situation and why the person was difficult",
          "Stayed calm and listened to understand their side",
          "Found the underlying need or concern",
          "The action taken and the outcome",
          "What they learned",
        ],
      },
    ],
  },
};

function buildRubric(role: RoleId, spec: Spec): Rubric {
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

export const QUESTIONS: SeedQuestion[] = ROLES.flatMap((role) =>
  (["free", "pro"] as const).flatMap((tier) =>
    BANK[role.id][tier].map((spec, i) => ({
      role: role.id,
      domain: role.domain,
      kind: spec.kind,
      tier,
      position: i + 1,
      question_text: spec.text,
      rubric: buildRubric(role.id, spec),
    })),
  ),
);
