"use client";

import { LogOut, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button, Notice, Sheet } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";

const REFRESH_MS = 30_000;

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/login", { password });
      cue("success");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Sheet className="arrive mx-auto mt-10 w-full max-w-sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Admin</h1>
          <p className="text-[15px] text-muted">Signups and the interview funnel. Team only.</p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="sr-only">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            placeholder="Admin password"
            className="h-12 rounded-2xl bg-sunken/60 px-4 text-[17px] ring-1 ring-line ring-inset outline-none placeholder:text-faint focus:ring-2 focus:ring-ink/30"
          />
        </label>
        {error && <Notice key={error}>{error}</Notice>}
        <Button type="submit" size="lg" loading={busy} disabled={!password} className="w-full">
          Sign in
        </Button>
      </form>
    </Sheet>
  );
}

/** Refreshes the server-rendered numbers every 30 seconds, and signs out. */
export function AdminControls({ renderedAt }: { renderedAt: string }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => startRefresh(() => router.refresh()), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  async function signOut() {
    setSigningOut(true);
    await api("/api/admin/logout", {}).catch(() => {});
    router.refresh();
  }

  const time = new Date(renderedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" });

  return (
    <div className="flex items-center gap-1">
      <span className="hidden text-sm tabular-nums text-muted sm:inline" aria-live="polite">
        Updated {time}
      </span>
      <Button
        variant="quiet"
        size="sm"
        aria-label="Refresh now"
        onClick={() => startRefresh(() => router.refresh())}
        className="w-9 px-0"
      >
        <RotateCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
      </Button>
      <Button variant="secondary" size="sm" loading={signingOut} onClick={signOut}>
        {!signingOut && <LogOut className="size-4" />}
        Sign out
      </Button>
    </div>
  );
}
