import Link from "next/link";

// Phase 1 placeholder: Pine Labs checkout replaces this in Phase 2.
export default async function CheckoutPage(props: PageProps<"/checkout/[sessionId]">) {
  const { sessionId } = await props.params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Payments open in a few minutes</h1>
      <p className="text-stone-600">
        Your answers and feedback are saved. Keep this page open or come back to the same link,
        and you&apos;ll be able to unlock the full interview here.
      </p>
      <Link
        href={`/interview/${sessionId}`}
        className="flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white font-medium"
      >
        Back to my feedback
      </Link>
    </main>
  );
}
