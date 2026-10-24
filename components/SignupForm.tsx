"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/clientApi";
import { ROLES } from "@/lib/roles";

/** Keeps the 10 local digits, accepting pasted +91 / 0 prefixes. */
function localDigits(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(2, 12);
  if (digits.length > 10 && digits.startsWith("0")) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [isEventStaff, setIsEventStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) return setError("Pick the role you're preparing for.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a 10-digit Indian mobile number.");
    if (!consent) return setError("Please accept the consent note to continue.");

    setSubmitting(true);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    try {
      const { sessionId } = await api<{ sessionId: string }>("/api/signup", {
        name,
        phone,
        role,
        consent,
        isEventStaff,
        ref: params.get("ref") ?? undefined,
        src: params.get("src") ?? undefined,
      });
      router.push(`/interview/${sessionId}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          maxLength={60}
          placeholder="Priya Sharma"
          className="h-12 rounded-xl border border-stone-300 px-3 text-base outline-none focus:border-stone-900"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Mobile number</span>
        <div className="flex h-12 overflow-hidden rounded-xl border border-stone-300 focus-within:border-stone-900">
          <span className="flex items-center border-r border-stone-200 bg-stone-50 px-3 text-base text-stone-500">+91</span>
          <input
            value={phone}
            onChange={(e) => setPhone(localDigits(e.target.value))}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required
            placeholder="98765 43210"
            className="min-w-0 flex-1 px-3 text-base outline-none"
          />
        </div>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Role you&apos;re preparing for</legend>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              aria-pressed={role === r.id}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
                role === r.id
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-stone-900"
          />
          We store your answers to give you feedback. We never share your number.
        </label>
        <label className="flex items-start gap-3 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={isEventStaff}
            onChange={(e) => setIsEventStaff(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-stone-900"
          />
          I&apos;m event staff or a mentor
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-13 items-center justify-center gap-2 rounded-xl bg-orange-600 text-base font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" /> Starting your interview…
          </>
        ) : (
          <>
            Start my free interview <ArrowRight className="size-5" />
          </>
        )}
      </button>
    </form>
  );
}
