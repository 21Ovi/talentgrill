"use client";

import { useEffect, useState } from "react";

export function LiveCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const data = (await res.json()) as { interviewsToday?: number };
        if (alive && typeof data.interviewsToday === "number") setCount(data.interviewsToday);
      } catch {
        // The counter is decoration; a failed refresh keeps the last value.
      }
    };
    void tick();
    const timer = setInterval(tick, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <p className="flex h-6 items-center gap-2.5 text-[15px] text-muted" aria-live="polite">
      {count !== null && (
        <>
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-ok" />
          </span>
          <span className="tabular-nums">
            {count > 0
              ? `${count} interview${count === 1 ? "" : "s"} practised today`
              : "Be the first to practise today"}
          </span>
        </>
      )}
    </p>
  );
}
