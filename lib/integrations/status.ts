import { env } from "../env";

export type Vendor = "agenticorg" | "elevenlabs" | "pinelabs" | "vobiz";
export type Mode = "live" | "stub" | "disabled";

type Health = { lastSuccessAt: string | null; lastError: { at: string; message: string } | null };

const VENDORS: Vendor[] = ["agenticorg", "elevenlabs", "pinelabs", "vobiz"];

const g = globalThis as unknown as { __integrationHealth?: Record<Vendor, Health> };
const health = (g.__integrationHealth ??= Object.fromEntries(
  VENDORS.map((v) => [v, { lastSuccessAt: null, lastError: null }]),
) as Record<Vendor, Health>);

/** Throws if a vendor is stubbed in production without ALLOW_STUBS=true. */
export function integrationMode(vendor: Vendor): Mode {
  const e = env();
  if (vendor === "vobiz") return e.VOBIZ_ENABLED ? "live" : "disabled";
  const mode = { agenticorg: e.AGENTICORG_MODE, elevenlabs: e.ELEVENLABS_MODE, pinelabs: e.PINELABS_MODE }[vendor];
  if (mode === "stub" && e.NODE_ENV === "production" && !e.ALLOW_STUBS) {
    throw new Error(`${vendor} is in stub mode but ALLOW_STUBS is not true`);
  }
  if (vendor === "elevenlabs" && mode === "live" && !e.ELEVENLABS_API_KEY) {
    throw new Error("elevenlabs is live but ELEVENLABS_API_KEY is not set");
  }
  return mode;
}

export function recordSuccess(vendor: Vendor): void {
  health[vendor].lastSuccessAt = new Date().toISOString();
}

export function recordError(vendor: Vendor, err: unknown): void {
  health[vendor].lastError = {
    at: new Date().toISOString(),
    message: err instanceof Error ? err.message : String(err),
  };
}

/** Never throws: a misconfigured vendor is reported, not raised. */
export function integrationReport(): Record<Vendor, Health & { mode: Mode | "misconfigured"; error?: string }> {
  return Object.fromEntries(
    VENDORS.map((v) => {
      try {
        return [v, { mode: integrationMode(v), ...health[v] }];
      } catch (err) {
        return [v, { mode: "misconfigured", error: err instanceof Error ? err.message : String(err), ...health[v] }];
      }
    }),
  ) as ReturnType<typeof integrationReport>;
}
