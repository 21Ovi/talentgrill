/**
 * Render's internal Postgres hostnames have no dots and no TLS. External
 * hostnames (used from a laptop) require TLS. Shared by lib/db.ts and scripts/.
 */
export function pgSsl(url: string): { rejectUnauthorized: false } | undefined {
  const host = new URL(url).hostname;
  const local = host === "" || host === "localhost" || host === "127.0.0.1";
  return !local && host.includes(".") ? { rejectUnauthorized: false } : undefined;
}
