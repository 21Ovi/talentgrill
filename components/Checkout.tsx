"use client";

import { Check, Lock, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, buttonClass, Notice, Orb, Sheet } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";

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
    <Sheet className="arrive flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Unlock the full mock</h1>
        <p className="text-[17px] text-muted">One payment of ₹{rupees}. No subscription.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {UNLOCKS.map((item) => (
          <li key={item} className="flex gap-3 text-[16px] leading-snug">
            <Check className="mt-0.5 size-4 shrink-0 stroke-[2.5] text-ok" />
            {item}
          </li>
        ))}
      </ul>
      {error && <Notice key={error}>{error}</Notice>}
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={pay} loading={paying} className="w-full">
          {!paying && <Lock className="size-[18px]" />}
          {paying ? "Opening secure checkout…" : `Pay ₹${rupees} securely`}
        </Button>
        <p className="text-center text-sm text-muted">Payments by Pine Labs. UPI, cards and netbanking.</p>
      </div>
      <p className="text-sm text-faint">
        A human reviews your interview before any certificate is issued. Review does not guarantee certification.
      </p>
      <Link href={`/interview/${sessionId}`} className={buttonClass("quiet", "sm", "self-center")}>
        Back to my feedback
      </Link>
    </Sheet>
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
      <Panel icon={<Badge tone="ok"><Check className="size-7 stroke-[2.5]" /></Badge>} title="Payment confirmed" cue="success">
        <p className="text-[17px] text-muted">Taking you to your next question…</p>
        <Link href={`/interview/${result.sessionId}`} className={buttonClass("primary", "lg", "w-full")}>
          Continue my interview
        </Link>
      </Panel>
    );
  }
  if (result?.status === "FAILED" || gaveUp) {
    return (
      <Panel
        icon={<Badge tone="danger"><X className="size-7 stroke-[2.5]" /></Badge>}
        title={gaveUp ? "Still waiting for the bank" : "Payment didn't go through"}
        cue="error"
      >
        <p className="text-[17px] text-muted">
          {gaveUp
            ? "If money left your account, it will show up here within a few minutes. Otherwise, try again."
            : "No money was taken. You can try again with UPI, a card or netbanking."}
        </p>
        {sessionId && (
          <Link href={`/checkout/${sessionId}`} className={buttonClass("primary", "lg", "w-full")}>
            <RotateCcw className="size-[18px]" /> Try again
          </Link>
        )}
      </Panel>
    );
  }
  return (
    <Panel icon={<Orb state="thinking" className="size-16" />} title="Confirming your payment…">
      <p className="text-[17px] text-muted">This usually takes a few seconds. Keep this page open.</p>
      {error && <p className="text-[15px] text-danger">{error}</p>}
    </Panel>
  );
}

function Panel({ icon, title, cue: arrivalCue, children }: { icon: ReactNode; title: string; cue?: "success" | "error"; children: ReactNode }) {
  useEffect(() => {
    if (arrivalCue) cue(arrivalCue);
  }, [arrivalCue]);
  return (
    <section className="arrive flex flex-col items-start gap-4">
      {icon}
      <h1 className="font-serif text-[30px] leading-tight">{title}</h1>
      {children}
    </section>
  );
}

function Badge({ tone, children }: { tone: "ok" | "danger"; children: ReactNode }) {
  return (
    <span className={`flex size-14 items-center justify-center rounded-full ${tone === "ok" ? "bg-ok/12 text-ok" : "bg-danger/12 text-danger"}`}>
      {children}
    </span>
  );
}
