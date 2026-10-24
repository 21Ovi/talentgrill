import { z } from "zod";
import { logError, type AuditEvent } from "./events";

/** An error whose message is safe to show the user. */
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}

export function isUuid(s: string): boolean {
  return z.uuid().safeParse(s).success;
}

export function notFound(what = "Session"): Response {
  return json({ error: `${what} not found.` }, 404);
}

/**
 * Runs a route body. HttpErrors become their status; anything else is logged
 * as `<area>_error` and the user gets a human message with a retry hint.
 */
export async function handle(
  area: string,
  fn: () => Promise<Response>,
  ctx: Omit<AuditEvent, "actor" | "type"> = {},
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(`[${area}]`, err);
    await logError(area, err, ctx);
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
