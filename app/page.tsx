import { LiveCounter } from "@/components/LiveCounter";
import { SignupForm } from "@/components/SignupForm";

const STEPS = [
  "Answer real placement questions, out loud or typed.",
  "Stuck? Tap for a nudge, not the answer.",
  "Get feedback in seconds: one strength, two fixes.",
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-8">
      <header className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className="flex size-7 items-center justify-center rounded-lg bg-orange-600 text-white">T</span>
        TalentGrill AI
      </header>

      <section className="flex flex-col gap-3">
        <h1 className="text-[2rem] font-semibold leading-tight tracking-tight">
          Practise your interview out loud before the real one.
        </h1>
        <p className="text-base text-stone-600">
          2 free questions with instant feedback. ₹5 unlocks the full mock interview and a
          human-verified certificate.
        </p>
        <LiveCounter />
      </section>

      <SignupForm />

      <ol className="flex flex-col gap-2 text-sm text-stone-600">
        {STEPS.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <footer className="mt-auto pt-4 text-center text-xs text-stone-500">Built live at AI Builders Day</footer>
    </main>
  );
}
