import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

export const ADMIN_COOKIE = "tg_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

type AdminConfig = { password: string; secret: string };

/** Null until ADMIN_PASSWORD and ADMIN_COOKIE_SECRET are both set. */
export function adminConfig(): AdminConfig | null {
  const e = env();
  return e.ADMIN_PASSWORD && e.ADMIN_COOKIE_SECRET ? { password: e.ADMIN_PASSWORD, secret: e.ADMIN_COOKIE_SECRET } : null;
}

/** Constant-time comparison of two strings of any length. */
function same(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

function sign(secret: string, expiresAt: number): string {
  return createHmac("sha256", secret).update(`admin:${expiresAt}`).digest("base64url");
}

export function passwordMatches(input: string): boolean {
  const config = adminConfig();
  return !!config && same(input, config.password);
}

/**
 * The cookie value: an expiry and its signature. No server-side session
 * table; rotating ADMIN_COOKIE_SECRET signs everyone out.
 */
export function issueAdminToken(): string {
  const config = adminConfig();
  if (!config) throw new Error("admin is not configured");
  const expiresAt = Date.now() + ADMIN_SESSION_SECONDS * 1000;
  return `${expiresAt}.${sign(config.secret, expiresAt)}`;
}

function tokenValid(token: string | undefined): boolean {
  const config = adminConfig();
  if (!config || !token) return false;
  const [raw, signature] = token.split(".");
  const expiresAt = Number(raw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now() || !signature) return false;
  return same(signature, sign(config.secret, expiresAt));
}

/** True when this request carries a valid admin cookie. */
export async function isAdmin(): Promise<boolean> {
  return tokenValid((await cookies()).get(ADMIN_COOKIE)?.value);
}
