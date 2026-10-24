// Question bank: 5 per role (2 free, 3 pro), Indian campus-placement fresher level.
// Structure, communication and role_fit descriptors are shared; domain_accuracy
// and problem_solving are written per question.
import { ROLES, type RoleId } from "../../lib/roles.ts";
import { buildRubric, d, type Rubric, type Spec } from "../../lib/rubric.ts";

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
  "cloud-engineer": {
    free: [
      {
        kind: "domain",
        text: "What is a VPC, and how is a public subnet different from a private subnet?",
        domain_accuracy: d(
          "Calls a VPC 'a server' or 'the cloud' and can't say what makes a subnet public.",
          "Describes a VPC as an isolated network and says public subnets face the internet, but doesn't know it's the route table and internet gateway that make them public.",
          "Explains a VPC as an isolated network with its own CIDR range, that a public subnet routes to an internet gateway while a private one goes out only through a NAT gateway, and where security groups fit.",
        ),
        problem_solving: d(
          "Recites definitions with no reason why you would split subnets at all.",
          "Gives a reason for the split, like keeping the database private, but doesn't tie it to a concrete layout.",
          "Walks through a real layout, such as the load balancer in public subnets and app servers and database in private subnets across two availability zones, and explains why.",
        ),
        key_points: [
          "A VPC (VNet in Azure) is a logically isolated private network in the cloud with its own IP range (CIDR block)",
          "Subnets divide the VPC's range, and each one sits in a single availability zone",
          "A public subnet's route table has a route to an internet gateway; a private subnet's does not",
          "Private subnets reach the internet outbound only, through a NAT gateway",
          "Typical layout: load balancer in public subnets, app servers and database in private subnets",
          "Security groups then control which ports and sources can reach each instance",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a college or personal project where you deployed something to the cloud. What did you set up, and what was one problem you had to fix?",
        domain_accuracy: d(
          "Stays vague, like 'I used AWS', without naming any service, setting or detail.",
          "Names the services used, such as an EC2 instance or an S3 bucket, but is fuzzy on how they were configured or connected.",
          "Describes the setup concretely: instance type and region, which ports the security group opened, how the app was kept running and reached, and where data or files were stored.",
        ),
        problem_solving: d(
          "Says it just worked, or that a friend or tutorial fixed the problem for them.",
          "Describes the problem and the fix but not how they found the cause.",
          "Explains how they narrowed the problem down, such as checking logs, the security group or the port the app listened on, and what they would do differently now.",
        ),
        key_points: [
          "Clear picture of what was deployed and why that cloud service was chosen",
          "Concrete config: instance or service type, region, ports opened in the security group",
          "How the app was kept running and reached, e.g. a process manager like systemd or PM2, a public IP or domain",
          "One real problem, like the app not reachable on port 80, and the steps used to find the cause",
          "Basic hygiene: no hardcoded keys, stopping unused resources to avoid charges",
          "An honest reflection on what they'd change next time",
        ],
      },
    ],
    pro: [
      {
        kind: "situational",
        text: "Users say your company's website, running on a single cloud server, has suddenly stopped loading. What do you do?",
        domain_accuracy: d(
          "Only says 'restart the server' or 'raise a ticket with the cloud provider'.",
          "Checks that the instance is running and looks at logs, but misses layers like the security group, DNS or a full disk.",
          "Checks layer by layer: instance status checks and CPU, memory and disk, whether the service is up and listening, security group and DNS, then the web server and app logs.",
        ),
        problem_solving: d(
          "Changes things at random or restarts without first finding out what broke.",
          "Has a reasonable list of checks but no order, and no thought for users while debugging.",
          "Confirms scope and recent changes first, works outside-in to isolate the failing layer, restores service fast, keeps people updated, then fixes the root cause with alerts and redundancy.",
        ),
        key_points: [
          "Confirm the problem: is it down for everyone, and what changed recently (a deploy, config or certificate)",
          "Check the instance: console status checks, CPU and memory, disk full (df -h, top)",
          "Check the service: is the process running and listening on the right port (systemctl status, ss -tlnp)",
          "Check the network path: security group rules, DNS, load balancer health checks if any",
          "Read the web server and app logs to find the actual error",
          "Restore first, then fix the root cause and add monitoring, alerts and a second instance",
        ],
      },
      {
        kind: "domain",
        text: "How is vertical scaling different from horizontal scaling? Which would you choose to keep a shopping site running during a big festive sale?",
        domain_accuracy: d(
          "Mixes up the two terms, or thinks scaling just means buying a bigger plan.",
          "Correctly says scaling up is a bigger machine and scaling out is more machines, but doesn't link it to availability or how traffic is spread.",
          "Explains that vertical scaling has a ceiling and stays a single point of failure, while horizontal scaling uses a load balancer and auto scaling group across availability zones, and that the app must be stateless.",
        ),
        problem_solving: d(
          "Picks one option with no reason given.",
          "Picks horizontal scaling but doesn't consider what has to change in the app or what it costs.",
          "Weighs the trade-off: scale out with auto scaling, move sessions to a shared store, plan for the database bottleneck, scale up before the sale, and scale back down afterwards to control cost.",
        ),
        key_points: [
          "Vertical scaling: a bigger instance; simple, but has a hardware limit and often needs a restart",
          "Horizontal scaling: more instances behind a load balancer, so one failure doesn't take the site down",
          "Auto scaling groups add or remove instances based on CPU or request metrics",
          "Spread instances across multiple availability zones for high availability",
          "App must be stateless: sessions in Redis or a database, uploaded files in object storage",
          "The database is often the bottleneck, and scaling down after the sale saves cost",
        ],
      },
      {
        kind: "situational",
        text: "In your first month on the job, you realise you accidentally pushed the team's cloud access keys to a public GitHub repo. What do you do?",
        domain_accuracy: d(
          "Thinks deleting the file or making the repo private is enough.",
          "Knows to deactivate or rotate the keys but doesn't check what they were already used for.",
          "Revokes and rotates the keys at once, checks activity logs like CloudTrail and billing for unknown resources, removes the secret from git history, and moves to IAM roles or a secrets manager with least privilege.",
        ),
        problem_solving: d(
          "Hides the mistake or hopes nobody notices.",
          "Fixes the keys and tells the team, but treats it as a one-off with nothing to stop it happening again.",
          "Tells the lead right away, acts in the right order (revoke, investigate, clean up), and suggests guardrails like secret scanning and pre-commit hooks.",
        ),
        key_points: [
          "Assume the keys are already compromised: bots scan public GitHub repos within minutes",
          "Deactivate and rotate the keys immediately, before anything else",
          "Tell the lead or security team right away; owning the mistake early matters",
          "Check activity logs (e.g. CloudTrail) and billing for unknown instances or data access",
          "Remove the secret from git history; deleting it in a new commit is not enough",
          "Prevent repeats: IAM roles instead of long-lived keys, least privilege, a secrets manager, secret scanning",
        ],
      },
    ],
  },
  "cybersecurity-analyst": {
    free: [
      {
        kind: "domain",
        text: "Can you explain the CIA triad in security, with a simple example of an attack on each part?",
        domain_accuracy: d(
          "Confuses CIA with the intelligence agency or can't name confidentiality, integrity and availability.",
          "Defines confidentiality, integrity and availability correctly but gives vague or mismatched examples.",
          "Defines all three clearly, matches each to a real attack like a data leak, tampered records or a DDoS, and names a control for each such as encryption, hashing or backups.",
        ),
        problem_solving: d(
          "Recites a memorized definition with no examples.",
          "Gives examples but doesn't connect them to how you would protect against them.",
          "Uses one everyday system, such as a college results portal, to show all three, and notes they can trade off, like strict access control hurting availability.",
        ),
        key_points: [
          "Confidentiality: only authorized people can see the data (leaked database, shoulder surfing)",
          "Integrity: data isn't changed without authorization (tampered marks, altered bank transfer)",
          "Availability: systems are up when needed (DDoS, ransomware locking files)",
          "Controls: encryption and access control, hashing and digital signatures, backups and redundancy",
          "The three can conflict, e.g. tighter access control can slow or block legitimate users",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a security project, lab or CTF challenge you worked on. What exactly did you do, and what did you learn?",
        domain_accuracy: d(
          "Describes the project only in buzzwords, like 'hacking' or 'used Kali', with no real technique named.",
          "Names the tools and attack used, such as Nmap or SQL injection, but can't explain how they work underneath.",
          "Explains the specific technique and why it worked, for example an unparameterized query or an open port running an outdated service, and how it would be fixed or detected.",
        ),
        problem_solving: d(
          "Can't say what their own part was or what problem they were solving.",
          "Walks through the steps they followed but not why they chose them or what went wrong.",
          "Explains their approach, a point where they got stuck and how they got past it, and what they would do differently now.",
        ),
        key_points: [
          "Clear goal: what system or challenge, and what they were trying to find or protect",
          "Their own contribution, separate from the team's or a tutorial's",
          "The specific technique or tool, e.g. an Nmap scan, Burp Suite, Wireshark, a SQL injection payload",
          "Why it worked and how it would be fixed or detected",
          "Worked only in a legal lab, CTF or with written permission",
          "One concrete lesson they still use",
        ],
      },
    ],
    pro: [
      {
        kind: "situational",
        text: "You're on a SOC shift and see hundreds of failed logins on one account, then a successful login from another country. What do you do?",
        domain_accuracy: d(
          "Calls it normal user error, or says 'block the whole country' without understanding the alert.",
          "Recognizes a likely brute force or credential stuffing attack and suggests resetting the password.",
          "Identifies brute force or credential stuffing followed by a likely account takeover, checks source IPs, impossible travel and MFA status, and contains by killing sessions, resetting credentials and checking what the attacker accessed.",
        ),
        problem_solving: d(
          "Acts alone without checking logs, or ignores it hoping it's a false positive.",
          "Takes sensible steps but in a random order, or skips escalation and documentation.",
          "Follows a clear order: verify with logs and the user, contain, escalate per the playbook, investigate what was accessed, document, and suggest fixes like MFA and a lockout policy.",
        ),
        key_points: [
          "The pattern points to brute force or credential stuffing, then a possible account takeover",
          "Check logs: source IPs, timestamps, impossible travel, device, MFA prompts",
          "Verify with the user through a separate channel, e.g. a phone call",
          "Contain quickly: kill active sessions, disable or reset the account, block malicious IPs",
          "Escalate per the playbook and look for what the attacker accessed or changed",
          "Document the timeline and recommend MFA, account lockout and better alerting",
        ],
      },
      {
        kind: "domain",
        text: "A website shows the padlock icon for HTTPS. What does that actually protect, and what can still go wrong?",
        domain_accuracy: d(
          "Says the padlock means the site is safe or can't be hacked.",
          "Explains that TLS encrypts data in transit but can't name what it leaves unprotected.",
          "Explains TLS encryption, integrity and certificate-based server identity, and says it doesn't stop phishing sites with valid certificates, SQL injection or XSS on the server, or a compromised device.",
        ),
        problem_solving: d(
          "Gives a one-line answer with no reasoning about where attacks actually happen.",
          "Lists a few gaps but doesn't tie them to where in the path the risk sits.",
          "Walks the path from browser to network to server, shows what TLS covers at each step, and lands on why you still need input validation, patching and user awareness.",
        ),
        key_points: [
          "TLS gives confidentiality and integrity in transit, so no sniffing or tampering on public Wi-Fi",
          "The certificate proves the domain's identity, not that the owner is honest",
          "Phishing sites can get free valid certificates, so the padlock doesn't mean trust",
          "Server-side bugs like SQL injection and XSS still work over HTTPS",
          "Data at rest on the server and an infected user device are not protected by TLS",
          "Expired or mismatched certificates and old TLS versions are warning signs",
        ],
      },
      {
        kind: "situational",
        text: "You closed an alert as a false positive, and two days later the team finds it was a real attack. How do you handle it?",
        domain_accuracy: d(
          "Has no idea how a missed alert affects the incident or what to do technically.",
          "Says they would share what they saw but doesn't connect it to the investigation timeline.",
          "Shares the original alert and their reasoning to help scope the incident and push the timeline back two days, checks for persistence and lateral movement, and suggests tuning the detection rule or triage checklist.",
        ),
        problem_solving: d(
          "Hides the mistake, blames the tool or someone else, or panics.",
          "Owns up but stops at an apology without a plan to prevent it happening again.",
          "Owns it quickly, helps with the response first, then does a blameless review of why it looked benign and proposes a concrete fix like a second check for that alert type.",
        ),
        key_points: [
          "Tell the lead immediately and own it; speed matters during an incident",
          "Hand over the original alert, logs and reasoning to help scope the attack",
          "The attacker may have had two extra days, so check for lateral movement and persistence",
          "Help with the response before worrying about blame",
          "Find why it looked benign: missing context, a weak runbook, alert fatigue",
          "Propose a fix: rule tuning, alert enrichment, or peer review for that alert type",
        ],
      },
    ],
  },
  "data-engineer": {
    free: [
      {
        kind: "domain",
        text: "What is an ETL pipeline, and how is ETL different from ELT?",
        domain_accuracy: d(
          "Cannot say what extract, transform and load mean, or treats ETL and ELT as the same thing.",
          "Explains extract, transform and load correctly and says ELT transforms after loading, but cannot say why that matters.",
          "Explains that ETL transforms data before loading it into the warehouse while ELT loads raw data first and transforms it inside a warehouse like BigQuery or Snowflake with SQL, and links the choice to warehouse compute, keeping raw data for reprocessing, and privacy needs.",
        ),
        problem_solving: d(
          "Gives a textbook definition with no example and no reason to pick either approach.",
          "Gives one example pipeline but picks an approach without explaining why.",
          "Walks through a concrete example, like loading app orders into a warehouse, and reasons about when each fits: masking sensitive data before load, cheap warehouse compute, or needing to re-run transforms later.",
        ),
        key_points: [
          "Extract from sources (app databases, APIs, files), transform (clean, join, aggregate), load into a target",
          "ETL transforms before loading, often in a separate tool or Spark job",
          "ELT loads raw data first and transforms inside the warehouse with SQL (e.g. dbt on BigQuery or Snowflake)",
          "ELT keeps the raw data, so transforms can be fixed and re-run later",
          "ETL suits cases where sensitive data must be masked or filtered before it lands",
          "Choice depends on warehouse compute cost, data volume and team skills",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a project where you worked with messy data. How did you clean it, and how did you check the final data was correct?",
        domain_accuracy: d(
          "Describes no real cleaning steps beyond 'I removed the errors'.",
          "Mentions common fixes like dropping nulls or removing duplicates but not how they checked the result.",
          "Names specific issues such as nulls, duplicates, inconsistent date formats or bad joins, explains how each was handled, and describes validation checks like row counts, unique keys and value range checks.",
        ),
        problem_solving: d(
          "Gives a vague story with no clear problem, actions or outcome.",
          "Explains what they did step by step but not why they chose those fixes.",
          "Explains how they first profiled the data to find problems, made deliberate choices like fixing versus dropping rows, and verified the output against the source or expected totals.",
        ),
        key_points: [
          "Clear context: the project, the data source and roughly how big it was",
          "Specific problems found: nulls, duplicates, mixed date or currency formats, typos in categories",
          "Profiling first, e.g. counting nulls and distinct values per column",
          "Reasoned choices about when to drop, fill or flag bad rows",
          "Validation: row counts before and after, unique keys, value ranges, spot-checks against the source",
          "What they learned or would automate next time",
        ],
      },
    ],
    pro: [
      {
        kind: "situational",
        text: "Your nightly sales pipeline failed, and the business team's morning dashboard is still showing old numbers. What do you do?",
        domain_accuracy: d(
          "Re-runs the whole job blindly or says to wait for it to fix itself.",
          "Checks the logs to find the failing step and re-runs it, but ignores partial loads or duplicate data.",
          "Uses the scheduler and job logs to find the failed task, checks whether the cause is late source data, a schema change or resources, fixes it, and re-runs idempotently so a partial load does not create duplicates, then confirms row counts.",
        ),
        problem_solving: d(
          "Panics or starts changing code without understanding why it failed.",
          "Follows a sensible order of steps but forgets to tell the people using the dashboard.",
          "First tells stakeholders the data is stale with an expected fix time, then diagnoses, fixes, backfills and validates, and finally adds alerts or retries so it is caught earlier next time.",
        ),
        key_points: [
          "Tell the dashboard users the data is stale and give an expected fix time",
          "Check the scheduler (e.g. Airflow) and logs to find which task failed and why",
          "Common causes: late or missing source file, schema change, bad data, timeout or out of memory",
          "Re-run safely: idempotent loads, overwrite that day's partition, avoid duplicate rows",
          "Validate after the fix: row counts and totals compared with previous days",
          "Prevent repeats: alerts, retries, data checks and a short incident note",
        ],
      },
      {
        kind: "domain",
        text: "In college we learn to normalise databases, so why do data warehouses often use a denormalised star schema instead?",
        domain_accuracy: d(
          "Cannot explain normalisation or what a star schema is.",
          "Describes fact and dimension tables correctly but only says a star schema is 'faster' without explaining why.",
          "Explains that normalisation reduces redundancy and protects writes in transactional OLTP systems, while a star schema with a central fact table and denormalised dimension tables suits read-heavy OLAP queries with fewer joins, at the cost of some redundancy.",
        ),
        problem_solving: d(
          "Says one approach is simply better in every case.",
          "Notes there is a trade-off but gives no example table or query.",
          "Uses a concrete example, like a sales fact table with date, product and store dimensions, to show how analysts' queries get simpler and faster, and names the costs such as extra storage and handling changing dimensions.",
        ),
        key_points: [
          "Normalisation (up to 3NF) avoids duplication and update anomalies; ideal for OLTP apps with many small writes",
          "Warehouses are read-heavy (OLAP): large aggregations over many rows",
          "Star schema: a fact table of measures (sales amount, quantity) with keys to dimension tables (date, product, store)",
          "Fewer joins make queries simpler for analysts and faster for the engine",
          "Trade-offs: redundant data, more storage, handling slowly changing dimensions",
          "Snowflake schema is a middle ground with partly normalised dimensions",
        ],
      },
      {
        kind: "situational",
        text: "You changed a pipeline last week, and today you find it has been loading duplicate rows into a table other teams use. How do you handle it?",
        domain_accuracy: d(
          "Deletes rows by hand without knowing which ones are duplicates, or hides the issue.",
          "Finds and removes the duplicates, for example with a query on the key, but does not fix the root cause in the pipeline.",
          "Finds duplicates with GROUP BY or ROW_NUMBER over the business key, makes the load idempotent with a MERGE, upsert or partition overwrite, cleans and backfills the affected days, and adds a uniqueness check.",
        ),
        problem_solving: d(
          "Blames someone else or quietly fixes it hoping nobody noticed.",
          "Fixes the data but only tells the affected teams after they complain.",
          "Owns the mistake quickly, tells affected teams which dates and reports were wrong, pauses or rolls back the change, corrects history, and suggests a test or review step so the same change cannot slip through again.",
        ),
        key_points: [
          "Own it early and tell downstream teams which tables and dates are affected",
          "Stop the damage: pause the pipeline or roll back the change",
          "Find duplicates with GROUP BY on the business key or ROW_NUMBER() over it",
          "Fix the root cause: make loads idempotent with MERGE/upsert or partition overwrite",
          "Clean and backfill the affected period, then re-check counts and totals",
          "Prevent repeats: uniqueness tests, code review, testing on sample data before release",
        ],
      },
    ],
  },
  "frontend-developer": {
    free: [
      {
        kind: "domain",
        text: "What is the difference between state and props in React, and what happens when a component's state changes?",
        domain_accuracy: d(
          "Mixes up state and props or says a child can change the props it receives.",
          "Says props come from the parent and state is the component's own data, but is vague on what a state change triggers.",
          "Explains props as read-only inputs from the parent, state as data the component owns and updates with useState or setState, and that a state change re-renders that component and its children.",
        ),
        problem_solving: d(
          "Recites a definition with no example.",
          "Gives a simple example like a counter but does not say how to decide where data should live.",
          "Uses a concrete example, such as a search box passing its text to a results list, to show when to lift state up to a shared parent and pass it down as props.",
        ),
        key_points: [
          "Props are passed from parent to child and are read-only inside the child",
          "State is data a component owns and changes with useState or setState",
          "Updating state triggers a re-render of that component and its children",
          "Data flows one way: down through props, back up through callback props",
          "Lift state to the nearest common parent when two components need the same data",
          "Never mutate state directly; set a new value so React notices the change",
        ],
      },
      {
        kind: "behavioral",
        text: "Tell me about a website or web app you built in college or on your own. What was one tricky frontend problem you hit, and how did you solve it?",
        domain_accuracy: d(
          "Names a project but cannot say which technologies were used or how the page actually worked.",
          "Describes the stack, such as React and CSS, and a real problem like a broken layout, but explains the fix only loosely.",
          "Explains their own part and the stack clearly, and describes the problem and fix in real terms, such as a flexbox layout breaking on mobile fixed with media queries, or a stale-data bug fixed with the right useEffect dependencies.",
        ),
        problem_solving: d(
          "Says it 'just started working' or that a friend fixed it.",
          "Explains what they changed but not how they found the cause.",
          "Walks through how they narrowed it down with browser DevTools, console logs or testing on a real phone, and says what they would do differently next time.",
        ),
        key_points: [
          "A one-line summary of what the project did and who used it",
          "Their own role and the stack: HTML, CSS, JavaScript, React or similar",
          "One specific problem, such as a layout breaking on mobile or data not updating on screen",
          "How they found the cause: DevTools elements panel, console, network tab",
          "The fix and why it worked",
          "What they learned or would do differently",
        ],
      },
    ],
    pro: [
      {
        kind: "situational",
        text: "Users say your product listing page takes eight seconds to load on their phones, but it feels fast on your laptop. What do you do?",
        domain_accuracy: d(
          "Blames the users' phones or internet and suggests no real fix.",
          "Names one cause like large images or a big JavaScript bundle, without saying how to confirm it.",
          "Names likely causes such as uncompressed images, a large JavaScript bundle, render-blocking scripts or too many API calls, and fixes like compressing and lazy loading images, code splitting and caching.",
        ),
        problem_solving: d(
          "Starts rewriting the page or switching frameworks without measuring anything.",
          "Suggests running Lighthouse but does not reproduce the user's slow phone and network.",
          "Reproduces the problem with DevTools network and CPU throttling or a real budget phone, measures with Lighthouse and the network tab, fixes the biggest cost first and re-measures.",
        ),
        key_points: [
          "Reproduce it: DevTools mobile emulation with slow 3G and CPU throttling, or a real budget phone",
          "Measure first with Lighthouse and the network tab: what is largest and what blocks rendering",
          "Shrink images: compress, use WebP, serve the right size, lazy load images below the fold",
          "Cut JavaScript: code splitting, remove unused libraries, defer non-critical scripts",
          "Check API calls: fewer requests, pagination, caching",
          "Re-measure after each fix and confirm with users",
        ],
      },
      {
        kind: "domain",
        text: "A teammate made a div with a click handler act like a button, and it works fine with a mouse. Why could that be a problem, and what would you do instead?",
        domain_accuracy: d(
          "Sees no problem because it works with a mouse.",
          "Says to use a real button element but cannot explain who is affected or why.",
          "Explains that a div is not focusable, ignores Enter and Space, and is not announced as a button by screen readers, so a native button element is the fix, with role, tabindex and key handlers only as a last resort.",
        ),
        problem_solving: d(
          "Suggests adding CSS so it looks more clickable.",
          "Proposes the right fix but not how to check that it works.",
          "Proposes the native button and checks it by tabbing through the page with only a keyboard, trying a screen reader, and running Lighthouse or axe.",
        ),
        key_points: [
          "A div cannot be reached with the Tab key and ignores Enter and Space",
          "Screen readers do not announce a div as a button, so blind users may miss it",
          "A native button element gives focus, keyboard support and the button role for free",
          "If a div is unavoidable: role=button, tabindex=0 and handlers for Enter and Space",
          "Keep a visible focus style; never remove the outline without a replacement",
          "Test by tabbing through the page and with Lighthouse, axe or a screen reader",
        ],
      },
      {
        kind: "situational",
        text: "You shipped a CSS change, and a user reports the login page layout is now broken on their iPhone, though it looks fine in your Chrome. How do you handle it?",
        domain_accuracy: d(
          "Cannot suggest why a page would look different in Safari than in Chrome.",
          "Suspects a browser difference and checks another browser, but cannot name what might cause it.",
          "Reproduces it in Safari or an iOS simulator with remote inspection, suspects causes like unsupported CSS, 100vh on mobile Safari or a fixed width, and fixes it with a fallback or responsive rule.",
        ),
        problem_solving: d(
          "Says it works on their machine, or quietly pushes random fixes.",
          "Fixes the bug but does not tell the team or do anything to prevent it next time.",
          "Owns the mistake, tells the team, rolls back or hotfixes so users can log in, finds the root cause, and adds Safari and real-phone checks before future releases.",
        ),
        key_points: [
          "Own it early: tell the lead or team, and roll back if users cannot log in",
          "Get details from the user: device, iOS version, a screenshot",
          "Reproduce in Safari, on an iPhone or a simulator, using remote inspection",
          "Look for causes like unsupported CSS, 100vh on mobile Safari, fixed widths or missing prefixes",
          "Fix with a fallback or responsive rule and retest across browsers",
          "Prevent repeats: test on Safari and real phones, check caniuse before using new CSS",
        ],
      },
    ],
  },
};


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
