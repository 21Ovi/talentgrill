import Link from "next/link";
import { LiveCounter } from "@/components/LiveCounter";
import { SignupForm } from "@/components/SignupForm";
import { Brand, Orb, SoundToggle } from "@/components/ui";

// A real first-round question from the AI/ML bank: the page opens the way an interview does.
const SAMPLE_QUESTION = "Your model shows 95% accuracy, but the business team says it’s useless. What might be going on?";

const STEPS = [
  { title: "Answer out loud", body: "Real placement questions for your role. Speak, or type if you’re somewhere noisy." },
  { title: "Stuck? Ask for a nudge", body: "You get a hint that moves you forward, never the answer." },
  { title: "Hear what to fix", body: "One strength and two specific fixes, in seconds." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <Brand />
        <div className="flex items-center gap-1">
          <Link href="/login" className="px-3 py-2 text-[15px] font-semibold text-muted hover:text-ink">
            Log in
          </Link>
          <SoundToggle />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 items-center gap-10 pt-4 pb-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20 lg:pt-10">
        <section className="flex flex-col gap-8">
          <Orb className="arrive size-24 sm:size-28" />
          <figure className="arrive flex flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
            <blockquote className="max-w-[20ch] font-serif text-[2rem] leading-[1.15] tracking-[-0.015em] text-pretty sm:text-[2.5rem] lg:text-[2.85rem]">
              &ldquo;{SAMPLE_QUESTION}&rdquo;
            </blockquote>
            <figcaption className="text-[15px] text-muted">A real first-round question for AI/ML roles.</figcaption>
          </figure>
          <div className="arrive flex max-w-[44ch] flex-col gap-3" style={{ "--i": 2 } as React.CSSProperties}>
            <h1 className="text-xl font-semibold tracking-[-0.015em] sm:text-2xl">
              Could you answer that out loud, right now?
            </h1>
            <p className="text-[17px] leading-relaxed text-muted">
              Practise placement interviews in a live voice conversation with an AI interviewer, the way the real one
              happens. Free, with instant feedback.
            </p>
            <LiveCounter />
          </div>
        </section>

        <div className="arrive" style={{ "--i": 3 } as React.CSSProperties}>
          <SignupForm />
        </div>
      </div>

      <ol className="grid gap-6 border-t border-line pt-8 sm:grid-cols-3 sm:gap-10">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold tabular-nums text-muted">
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-[15px] font-semibold">{s.title}</h2>
              <p className="text-[15px] leading-snug text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="pt-12 text-sm text-faint">Built live at AI Builders Day.</footer>
    </main>
  );
}
