// Phase 0 placeholder; the landing page and onboarding form arrive in Phase 1.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Practise your interview out loud before the real one.
      </h1>
      <p className="text-base opacity-80">
        2 free questions, instant feedback, and ₹5 for the full mock interview with a
        human-verified certificate.
      </p>
      <p className="text-sm opacity-60">Opening shortly. Built live at AI Builders Day.</p>
    </main>
  );
}
