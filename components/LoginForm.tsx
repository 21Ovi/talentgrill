"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { localDigits } from "@/components/SignupForm";
import { Button, Notice, Sheet } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Set after logging in with the temporary password: the user must choose their own.
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a 10-digit Indian mobile number.");
    if (!password) return setError("Enter your password.");
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ sessionId?: string; mustChangePassword?: boolean }>("/api/login", { phone, password });
      if (res.mustChangePassword) {
        setMustChange(true);
        setSubmitting(false);
        return;
      }
      cue("success");
      router.push(`/interview/${res.sessionId}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return setError("Use at least 8 characters for your new password.");
    setSubmitting(true);
    setError(null);
    try {
      const { sessionId } = await api<{ sessionId: string }>("/api/password", {
        phone,
        currentPassword: password,
        newPassword,
      });
      cue("success");
      router.push(`/interview/${sessionId}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  if (mustChange) {
    return (
      <Sheet>
        <form onSubmit={onChangePassword} className="flex flex-col gap-6" noValidate>
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Set your own password</h1>
            <p className="text-[15px] text-muted">
              You logged in with the temporary password. Choose a new one now so only you can open your interviews.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl bg-sunken/60 ring-1 ring-line ring-inset">
            <label className="flex h-14 items-center gap-3 px-4">
              <span className="w-28 shrink-0 text-[15px] text-muted">New password</span>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                autoFocus
                required
                minLength={8}
                maxLength={128}
                placeholder="At least 8 characters"
                className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-faint"
              />
            </label>
          </div>
          {error && <Notice key={error}>{error}</Notice>}
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {submitting ? "Saving…" : "Save and continue"}
          </Button>
        </form>
      </Sheet>
    );
  }

  return (
    <Sheet>
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Welcome back</h1>
          <p className="text-[15px] text-muted">Log in to pick up your latest interview and practice course.</p>
        </div>
        <p className="flex gap-2.5 rounded-2xl bg-ember/10 px-4 py-3 text-[15px] leading-snug">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-ember-text" />
          <span>
            Signed up before we added passwords? Log in with the temporary password{" "}
            <span className="font-mono font-semibold">Simple@123</span>, then you&apos;ll set your own right away.
          </span>
        </p>
        <div className="overflow-hidden rounded-2xl bg-sunken/60 ring-1 ring-line ring-inset">
          <label className="flex h-14 items-center gap-3 px-4">
            <span className="w-20 shrink-0 text-[15px] text-muted">Mobile</span>
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
            <span className="w-20 shrink-0 text-[15px] text-muted">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-faint"
            />
          </label>
        </div>
        {error && <Notice key={error}>{error}</Notice>}
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? "Logging in…" : "Log in"}
        </Button>
        <p className="text-center text-[15px] text-muted">
          New here?{" "}
          <Link href="/" className="font-semibold text-ink underline-offset-4 hover:underline">
            Start a free interview
          </Link>
        </p>
      </form>
    </Sheet>
  );
}
