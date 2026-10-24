// In-memory token buckets. Correct only because we run exactly one instance.
// Venue Wi-Fi puts hundreds of people behind one IP, so per-IP limits are loose
// ceilings; the tight limits are keyed by phone or session.

type Bucket = { tokens: number; updatedAt: number };

const g = globalThis as unknown as { __buckets?: Map<string, Bucket> };
const buckets = (g.__buckets ??= new Map<string, Bucket>());

/** Takes one token from `key`'s bucket. Returns false when it is empty. */
export function take(key: string, capacity: number, refillPerSecond: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.updatedAt) / 1000) * refillPerSecond);
  b.updatedAt = now;
  const allowed = b.tokens >= 1;
  if (allowed) b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 20_000) prune(now);
  return allowed;
}

function prune(now: number) {
  for (const [key, b] of buckets) if (now - b.updatedAt > 10 * 60_000) buckets.delete(key);
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
