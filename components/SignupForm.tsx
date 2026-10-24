"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Notice, Sheet } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";
import { ROLES } from "@/lib/roles";

/** Keeps the 10 local digits, accepting pasted +91 / 0 prefixes. */
export function localDigits(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(2, 12);
  if (digits.length > 10 && digits.startsWith("0")) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [isEventStaff, setIsEventStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) return setError("Pick the role you're preparing for.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a 10-digit Indian mobile number.");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    if (!consent) return setError("Tick the consent note to continue.");

    setSubmitting(true);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    try {
      const { sessionId } = await api<{ sessionId: string }>("/api/signup", {
        name,
        phone,
        password,
        role,
        consent,
        isEventStaff,
        ref: params.get("ref") ?? undefined,
        src: params.get("src") ?? undefined,
      });
      cue("success");
      router.push(`/interview/${sessionId}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Sheet>
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Start your free interview</h2>
          <p className="text-[15px] text-muted">Takes about five minutes. Your password lets you come back later.</p>
        </div>

        {/* Grouped fields, like a settings list: one surface, hairline between rows. */}
        <div className="overflow-hidden rounded-2xl bg-sunken/60 ring-1 ring-line ring-inset">
          <label className="flex h-14 items-center gap-3 px-4">
            <span className="w-16 shrink-0 text-[15px] text-muted">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              maxLength={60}
              placeholder="Priya Sharma"
              className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-faint"
            />
          </label>
          <div className="ml-4 h-px bg-line" />
          <label className="flex h-14 items-center gap-3 px-4">
            <span className="w-16 shrink-0 text-[15px] text-muted">Mobile</span>
            <span className="text-[17px] text-muted">+91</span>
            <input
              value={phone}
              onChange={(e) => setPhone(localDigits(e.target.value))}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              required
              placeholder="98765 43210"
              className="h-full min-w-0 flex-1 bg-transparent text-[17px] tabular-nums outline-none placeholder:text-faint"
            />
          </label>
          <div className="ml-4 h-px bg-line" />
          <label className="flex h-14 items-center gap-3 px-4">
            <span className="w-16 shrink-0 text-[15px] text-muted">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              placeholder="At least 8 characters"
              className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-faint"
            />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-[15px] font-semibold">Role you&apos;re preparing for</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => {
              const on = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    cue("toggle");
                    setRole(r.id);
                  }}
                  aria-pressed={on}
                  className={`flex min-h-[68px] flex-col items-start justify-center gap-0.5 rounded-2xl px-3.5 py-2.5 text-left ring-inset transition-[scale,background-color,box-shadow] duration-300 ease-out-soft active:scale-[0.97] ${
                    on ? "bg-ink text-on-ink ring-0" : "bg-surface ring-1 ring-line hover:bg-sunken"
                  }`}
                >
                  <span className="text-[15px] font-semibold leading-tight">{r.label}</span>
                  <span className={`text-[13px] leading-tight ${on ? "opacity-70" : "text-muted"}`}>{r.domain}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3.5">
          <Checkbox checked={consent} onChange={setConsent}>
            We store your answers to give you feedback. We never share your number.
          </Checkbox>
          <Checkbox checked={isEventStaff} onChange={setIsEventStaff}>
            I&apos;m event staff or a mentor
          </Checkbox>
        </div>

        {error && <Notice key={error}>{error}</Notice>}

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? "Starting your interview…" : "Start my free interview"}
        </Button>
        <p className="text-center text-[15px] text-muted">
          Already practising?{" "}
          <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </Sheet>
  );
}

function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          cue("toggle");
          onChange(e.target.checked);
        }}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,scale] duration-300 ease-spring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember peer-active:scale-90 ${
          checked ? "bg-ink text-on-ink" : "ring-[1.5px] ring-faint ring-inset"
        }`}
      >
        <Check className={`size-3.5 stroke-[3] transition-[opacity,scale] duration-300 ease-spring ${checked ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} />
      </span>
      <span>{children}</span>
    </label>
  );
}
