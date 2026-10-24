import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Code2,
  FileText,
  GraduationCap,
  Languages,
  Lightbulb,
  MessageCircleQuestion,
  Mic,
  Quote,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LiveCounter } from "@/components/LiveCounter";
import { Reveal } from "@/components/landing/Reveal";
import { SignupForm } from "@/components/SignupForm";
import { buttonClass } from "@/components/buttonClass";
import { Brand, Orb, SoundToggle } from "@/components/ui";

// A real first-round question from the AI/ML bank: the page opens the way an interview does.
const SAMPLE_QUESTION = "Your model shows 95% accuracy, but the business team says it’s useless. What might be going on?";

type Status = "live" | "soon" | "partial";

const USPS = [
  {
    icon: Mic,
    title: "A real conversation, not a form",
    body: "A live, two-way voice interview. Your interviewer greets you, listens, asks follow-ups and nudges you when you’re stuck.",
  },
  {
    icon: Users,
    title: "Six agents, one plan for you",
    body: "Each agent does one job well and hands off to the next, so every step builds on what you’ve already done.",
  },
  {
    icon: Quote,
    title: "Built on your own words",
    body: "Feedback quotes what you actually said. Your course starts from your answers and your resume, not a generic syllabus.",
  },
  {
    icon: Languages,
    title: "Made for Indian placements",
    body: "Campus-level questions across 8 tracks, a clear Indian-English voice, and company prep for the recruiters you’re targeting.",
  },
];

const AGENTS: { name: string; role: string; body: string; status: Status; note?: string; hue: number }[] = [
  {
    name: "Lucy",
    role: "Resume reader",
    body: "Reads your resume, pulls out projects, skills and gaps, and tells your interviewer what’s worth asking about.",
    status: "live",
    hue: 165,
  },
  {
    name: "Anna",
    role: "Interviewer",
    body: "Runs a deeper live voice interview: a warm intro, a question from your resume, role questions, follow-ups and hints.",
    status: "live",
    hue: 0,
  },
  {
    name: "Matt",
    role: "Course creator",
    body: "Turns your feedback into a 5-lesson course with key takeaways, mistakes to avoid, quizzes and resources.",
    status: "live",
    hue: 215,
  },
  {
    name: "Emma",
    role: "Doubt solver",
    body: "Clears your doubts the moment you’re stuck in a lesson, in plain language, by chat or by voice.",
    status: "soon",
    hue: 320,
  },
  {
    name: "Ellie",
    role: "Examiner",
    body: "Runs your tests and coding rounds and grades them fairly. Course tests are live; coding rounds are next.",
    status: "partial",
    note: "Tests live",
    hue: 95,
  },
  {
    name: "Ovi",
    role: "Final judge",
    body: "Weighs everything you’ve done, builds a resume from skills you’ve proved, and suggests jobs that fit you.",
    status: "soon",
    hue: 265,
  },
];

const JOURNEY: { icon: typeof Mic; agent: string; title: string; body: string; status: Status }[] = [
  { icon: FileText, agent: "Lucy", title: "Share your resume", body: "Optional. Lucy reads it in seconds.", status: "live" },
  { icon: Mic, agent: "Anna", title: "Talk to your interviewer", body: "A live voice interview, starting with your own project.", status: "live" },
  { icon: Target, agent: "Anna", title: "Feedback in seconds", body: "A score, one strength and two specific fixes.", status: "live" },
  { icon: GraduationCap, agent: "Matt", title: "Learn from your answers", body: "A 5-lesson course with quizzes and resources.", status: "live" },
  { icon: ClipboardCheck, agent: "Ellie", title: "Pass the test", body: "Score 80% to unlock company prep.", status: "live" },
  { icon: BadgeCheck, agent: "Ovi", title: "Get placement-ready", body: "Your resume and job matches.", status: "soon" },
];

const TRACKS_LIVE = [
  "AI/ML Engineer",
  "Software Engineer",
  "Cloud Engineer",
  "Cybersecurity Analyst",
  "Data Engineer",
  "Frontend Developer",
  "Business Analyst",
  "Sales & HR Associate",
];

const TRACKS_SOON = [
  "Data Analyst",
  "DevOps Engineer",
  "Full-Stack Developer",
  "Mechanical Engineering",
  "Electrical & Electronics",
  "Civil Engineering",
  "Finance & Accounting",
  "Marketing",
  "Product Management",
];

const ROADMAP: { icon: typeof Mic; title: string; body: string; status: Status; agent?: string }[] = [
  {
    icon: Building2,
    title: "Company-based preparation",
    body: "Round-by-round guides for TCS, Infosys, Accenture, Amazon and 10 more, with likely questions and a practice test. Unlocks at 80%.",
    status: "live",
  },
  {
    icon: FileText,
    title: "Resume builder",
    body: "A resume written from the skills you proved in interviews and tests, tuned for each role you apply to.",
    status: "soon",
    agent: "Ovi",
  },
  {
    icon: MessageCircleQuestion,
    title: "Concept-clearing agent",
    body: "Ask Emma anything you didn’t get, from a lesson or your feedback, and get a clear explanation with an example.",
    status: "soon",
    agent: "Emma",
  },
  {
    icon: Code2,
    title: "Live code explainer",
    body: "Write or paste code and hear it explained line by line, then practise it in a coding round with Ellie.",
    status: "soon",
    agent: "Ellie",
  },
  {
    icon: ClipboardCheck,
    title: "Coding rounds and mock tests",
    body: "Timed aptitude, reasoning and coding rounds in the style of real online assessments, graded instantly.",
    status: "soon",
    agent: "Ellie",
  },
  {
    icon: Sparkles,
    title: "Job suggestions",
    body: "Roles and companies matched to your scores, skills and resume, so you apply where you’re ready.",
    status: "soon",
    agent: "Ovi",
  },
  {
    icon: Mic,
    title: "Weekly viva calls",
    body: "A short scheduled voice call every week to keep you sharp before placement season.",
    status: "soon",
  },
  {
    icon: Lightbulb,
    title: "More departments",
    body: "Core engineering, commerce, marketing and product tracks, each with its own question bank.",
    status: "soon",
  },
];

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#agents", label: "Agents" },
  { href: "#tracks", label: "Tracks" },
  { href: "#roadmap", label: "Roadmap" },
];

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link href="/" aria-label="TalentGrill home">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-full px-3 py-2 text-[15px] text-muted transition-colors hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <Link href="/login" className={buttonClass("quiet", "sm")}>
              Sign in
            </Link>
            <a href="#signup" className={buttonClass("primary", "sm")}>
              Sign up
            </a>
            <SoundToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8">
        {/* Hero: the original opening and sign-up form, unchanged in behaviour. */}
        <div className="relative grid grid-cols-1 items-center gap-10 overflow-x-clip pt-8 pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20 lg:pt-14">
          <div aria-hidden className="hero-glow pointer-events-none absolute -top-10 -left-10 -z-10 size-[28rem]" />
          <section className="flex flex-col gap-8">
            <Orb className="arrive size-24 sm:size-28" />
            <figure className="arrive flex flex-col gap-4" style={{ "--i": 1 } as CSSProperties}>
              <blockquote className="max-w-[20ch] font-serif text-[2rem] leading-[1.15] tracking-[-0.015em] text-pretty sm:text-[2.5rem] lg:text-[2.85rem]">
                &ldquo;{SAMPLE_QUESTION}&rdquo;
              </blockquote>
              <figcaption className="text-[15px] text-muted">A real first-round question for AI/ML roles.</figcaption>
            </figure>
            <div className="arrive flex max-w-[46ch] flex-col gap-3" style={{ "--i": 2 } as CSSProperties}>
              <h1 className="text-xl font-semibold tracking-[-0.015em] sm:text-2xl">
                Could you answer that out loud, right now?
              </h1>
              <p className="text-[17px] leading-relaxed text-muted">
                TalentGrill is a team of AI agents that gets Indian freshers placement-ready. Practise a live voice
                interview, get feedback in seconds, then learn from a course built on your own answers. Free to start.
              </p>
              <LiveCounter />
            </div>
          </section>

          <div id="signup" className="arrive scroll-mt-24" style={{ "--i": 3 } as CSSProperties}>
            <SignupForm />
          </div>
        </div>

        {/* USP */}
        <Section id="why" eyebrow="Why TalentGrill" title="Interview practice that actually feels like the interview.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {USPS.map((u, i) => (
              <Reveal key={u.title} delay={i}>
                <Card className="h-full">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-ember/12 text-ember-text">
                    <u.icon className="size-5" />
                  </span>
                  <h3 className="text-[17px] font-semibold leading-snug">{u.title}</h3>
                  <p className="text-[15px] leading-relaxed text-muted">{u.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Journey */}
        <Section id="how" eyebrow="How it works" title="From your first answer to placement-ready.">
          <ol className="relative grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {JOURNEY.map((j, i) => (
              <Reveal as="li" key={j.title} delay={i}>
                <Card className="h-full">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-full bg-sunken text-sm font-semibold tabular-nums text-muted">
                      {i + 1}
                    </span>
                    <StatusBadge status={j.status} />
                  </div>
                  <j.icon className="size-5 text-ember-text" />
                  <h3 className="text-[16px] font-semibold leading-snug">{j.title}</h3>
                  <p className="text-[14px] leading-snug text-muted">{j.body}</p>
                  <p className="mt-auto text-[13px] font-medium text-faint">with {j.agent}</p>
                </Card>
              </Reveal>
            ))}
          </ol>
        </Section>

        {/* Agents */}
        <Section
          id="agents"
          eyebrow="Meet your placement team"
          title="Six specialists. One shared picture of you."
          intro="Each agent is built for one job. They pass what they learn to each other, so you never start from zero."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((a, i) => (
              <Reveal key={a.name} delay={i}>
                <Card className="h-full">
                  <div className="flex items-center gap-3.5">
                    <span style={{ filter: `hue-rotate(${a.hue}deg)` }} className="shrink-0">
                      <Orb className="size-12 text-[18px] font-semibold">{a.name[0]}</Orb>
                    </span>
                    <div className="flex flex-1 flex-col">
                      <span className="text-[18px] font-semibold leading-tight">{a.name}</span>
                      <span className="text-[14px] text-muted">{a.role}</span>
                    </div>
                    <StatusBadge status={a.status} note={a.note} />
                  </div>
                  <p className="text-[15px] leading-relaxed text-muted">{a.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-6">
            <Card className="gap-5">
              <h3 className="text-[17px] font-semibold">How they work together</h3>
              <div className="relative">
                {/* The handoff line: horizontal on wide screens, vertical on phones. */}
                <div aria-hidden className="flow-line absolute top-6 right-[8%] left-[8%] hidden h-0.5 rounded-full lg:block" />
                <div aria-hidden className="flow-line-v absolute top-6 bottom-6 left-6 w-0.5 rounded-full lg:hidden" />
                <ol className="relative grid gap-5 lg:grid-cols-6 lg:gap-3">
                  {AGENTS.map((a) => (
                    <li key={a.name} className="flex items-center gap-3 lg:flex-col lg:text-center">
                      <span style={{ filter: `hue-rotate(${a.hue}deg)` }} className="shrink-0">
                        <Orb className="size-12 text-[17px] font-semibold">{a.name[0]}</Orb>
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[15px] font-semibold">{a.name}</span>
                        <span className="text-[13px] text-muted">{a.role}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="max-w-[75ch] text-[15px] leading-relaxed text-muted">
                Lucy’s resume notes shape Anna’s questions. Anna’s interview shapes Matt’s course. When a lesson is
                unclear, Emma explains it. Ellie’s test score unlocks company prep. Ovi brings it all together into
                your resume and job matches.
              </p>
            </Card>
          </Reveal>
        </Section>

        {/* Tracks */}
        <Section id="tracks" eyebrow="Tracks" title="Questions written for the role you want.">
          <Reveal>
            <Card className="gap-5">
              <div className="flex flex-col gap-2.5">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <StatusBadge status="live" /> Practise today
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRACKS_LIVE.map((t) => (
                    <span key={t} className="rounded-full bg-surface px-3.5 py-2 text-[15px] font-medium ring-1 ring-line ring-inset">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <StatusBadge status="soon" /> More departments
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRACKS_SOON.map((t) => (
                    <span key={t} className="rounded-full px-3.5 py-2 text-[15px] text-muted ring-1 ring-line ring-inset [border-style:dashed]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </Reveal>
        </Section>

        {/* Roadmap */}
        <Section id="roadmap" eyebrow="What’s next" title="Where TalentGrill is going.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROADMAP.map((r, i) => (
              <Reveal key={r.title} delay={i % 4}>
                <Card className="h-full">
                  <div className="flex items-center justify-between">
                    <r.icon className="size-5 text-ember-text" />
                    <StatusBadge status={r.status} />
                  </div>
                  <h3 className="text-[16px] font-semibold leading-snug">{r.title}</h3>
                  <p className="text-[14px] leading-relaxed text-muted">{r.body}</p>
                  {r.agent && <p className="mt-auto text-[13px] font-medium text-faint">with {r.agent}</p>}
                </Card>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Closing call to action */}
        <Reveal className="pt-20">
          <div className="flex flex-col items-center gap-6 rounded-[32px] bg-surface px-6 py-12 text-center shadow-[var(--shadow-sheet)] ring-1 ring-line ring-inset sm:py-16">
            <Orb className="size-16" />
            <h2 className="max-w-[22ch] font-serif text-[2rem] leading-tight sm:text-[2.5rem]">
              Your placement team is ready when you are.
            </h2>
            <p className="max-w-[48ch] text-[17px] text-muted">
              Five minutes, one live interview, and a plan built on your own answers. Free to start.
            </p>
            <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
              <a href="#signup" className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
                Start my free interview <ArrowRight className="size-[18px]" />
              </a>
              <Link href="/login" className={buttonClass("secondary", "lg", "w-full sm:w-auto")}>
                Sign in
              </Link>
            </div>
          </div>
        </Reveal>

        <footer className="flex flex-col gap-2 pt-12 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>Built live at AI Builders Day.</span>
          <span>Agents run on AgenticOrg · Voice by ElevenLabs</span>
        </footer>
      </main>
    </>
  );
}

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line pt-16 pb-4">
      <Reveal className="mb-8 flex max-w-[60ch] flex-col gap-2">
        <span className="text-sm font-semibold tracking-wide text-ember-text uppercase">{eyebrow}</span>
        <h2 className="font-serif text-[1.9rem] leading-tight tracking-[-0.01em] sm:text-[2.4rem]">{title}</h2>
        {intro && <p className="text-[17px] leading-relaxed text-muted">{intro}</p>}
      </Reveal>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`lift flex flex-col gap-3 rounded-[24px] bg-surface p-5 shadow-[var(--shadow-sheet)] ring-1 ring-line ring-inset sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status, note }: { status: Status; note?: string }) {
  if (status === "soon") {
    return (
      <span className="soon shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-muted">
        Coming soon
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-ok/12 px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-ok">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-ok" />
      </span>
      {note ?? "Live"}
    </span>
  );
}
