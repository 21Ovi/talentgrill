"use client";

import { CheckCircle2, Loader2, Lock, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/clientApi";

const UNLOCKS = [
  "3 more questions, including a tougher round",
  "Full scorecard with quotes from your own answers",
  "Model-answer outlines for every question",
  "Human review for a verified Interview-Ready certificate",
];

export function CheckoutStart({ sessionId, pricePaise }: { sessionId: string; pricePaise: number }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rupees = (pricePaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const { checkoutUrl } = await api<{ checkoutUrl: string }>("/api/payments/create", { sessionId });
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(errorMessage(err));
      setPaying(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Unlock the full mock for ₹{rupees}</h1>
      <ul className="flex flex-col gap-2 text-stone-700">
        {UNLOCKS.map((item) => (
          <li key={item} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>
      <p className="text-xs text-stone-500">
        A human reviews your interview before any certificate is issued. Review does not guarantee certification.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={pay}
        disabled={paying}
        className="flex h-13 items-center justify-center gap-2 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700 disabled:opacity-70"
      >
        {paying ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
        {paying ? "Opening secure checkout…" : `Pay ₹${rupees} securely`}
      </button>
      <p className="text-center text-xs text-stone-500">Payments by Pine Labs · UPI, cards and netbanking</p>
      <Link href={`/interview/${sessionId}`} className="text-center text-sm font-medium text-stone-600 underline">
        Back to my feedback
      </Link>
    </section>
  );
}

type Verify = { status: "CREATED" | "PENDING" | "SUCCESS" | "FAILED"; sessionId: string };

// Webhooks can lag a few seconds behind the redirect, so keep checking briefly.
const POLL_MS = 2_000;
const MAX_POLLS = 20;

export function CheckoutReturn({ paymentId }: { paymentId: string | null }) {
  const router = useRouter();
  const [result, setResult] = useState<Verify | null>(null);
  const [error, setError] = useState<string | null>(paymentId ? null : "We couldn't find that payment.");
  const [gaveUp, setGaveUp] = useState(false);
  const polls = useRef(0);

  useEffect(() => {
    if (!paymentId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const check = () =>
      api<Verify>(`/api/payments/verify?pid=${paymentId}`).then(
        (v) => {
          if (!alive) return;
          setResult(v);
          setError(null);
          if (v.status === "SUCCESS") timer = setTimeout(() => router.push(`/interview/${v.sessionId}`), 1_500);
          else if (v.status !== "FAILED" && ++polls.current < MAX_POLLS) timer = setTimeout(check, POLL_MS);
          else if (v.status !== "FAILED") setGaveUp(true);
        },
        (err) => {
          if (!alive) return;
          setError(errorMessage(err));
          if (++polls.current < MAX_POLLS) timer = setTimeout(check, POLL_MS);
        },
      );
    void check();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [paymentId, router]);

  const sessionId = result?.sessionId;

  if (result?.status === "SUCCESS") {
    return (
      <Panel icon={<CheckCircle2 className="size-8 text-emerald-600" />} title="Payment confirmed">
        <p className="text-stone-600">Taking you to your next question…</p>
        <Link href={`/interview/${result.sessionId}`} className="flex h-12 items-center justify-center rounded-xl bg-stone-900 font-semibold text-white">
          Continue my interview
        </Link>
      </Panel>
    );
  }
  if (result?.status === "FAILED" || gaveUp) {
    return (
      <Panel
        icon={<XCircle className="size-8 text-red-600" />}
        title={gaveUp ? "Still waiting for the bank" : "Payment didn't go through"}
      >
        <p className="text-stone-600">
          {gaveUp
            ? "If money left your account, it will show up here within a few minutes. Otherwise, try again."
            : "No money was taken. You can try again with UPI, a card or netbanking."}
        </p>
        {sessionId && (
          <Link href={`/checkout/${sessionId}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 font-semibold text-white">
            <RotateCcw className="size-5" /> Try again
          </Link>
        )}
      </Panel>
    );
  }
  return (
    <Panel icon={<Loader2 className="size-8 animate-spin text-orange-600" />} title="Confirming your payment…">
      <p className="text-stone-600">This usually takes a few seconds. Please don&apos;t close this page.</p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </Panel>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      {icon}
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </section>
  );
}
