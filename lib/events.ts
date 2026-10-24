import { createHash } from "node:crypto";
import { pool, type Queryable } from "./db";
import { env } from "./env";

export type Actor = "user" | "agent" | "admin" | "system" | "webhook";

export type AuditEvent = {
  actor: Actor;
  type: string;
  userId?: string | null;
  sessionId?: string | null;
  payload?: Record<string, unknown>;
};

/**
 * Appends to the audit log. Pass a transaction client to make the event
 * atomic with the action it records.
 */
export async function logEvent(e: AuditEvent, db: Queryable = pool()): Promise<void> {
  await db.query(
    "insert into events (actor, type, user_id, session_id, payload) values ($1, $2, $3, $4, $5)",
    [e.actor, e.type, e.userId ?? null, e.sessionId ?? null, e.payload ?? {}],
  );
}

/** Records `<area>_error`. Never throws, so a failed audit write can't mask the original error. */
export async function logError(
  area: string,
  err: unknown,
  ctx: Omit<AuditEvent, "actor" | "type"> = {},
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  try {
    await logEvent({ actor: "system", type: `${area}_error`, ...ctx, payload: { ...ctx.payload, message } });
  } catch (writeErr) {
    console.error(`[events] could not log ${area}_error: ${message}`, writeErr);
  }
}

/**
 * Hashed client IP and user agent, attached to user events so auditors can
 * see distinct devices without us storing raw IPs.
 */
export function requestMeta(req: Request): { ip_hash: string | null; ua: string | null } {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const salt = env().IP_HASH_SALT ?? "dev-salt";
  return {
    ip_hash: ip ? createHash("sha256").update(salt + ip).digest("hex").slice(0, 16) : null,
    ua: req.headers.get("user-agent")?.slice(0, 200) ?? null,
  };
}
