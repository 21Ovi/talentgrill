import { z } from "zod";
import { query } from "@/lib/db";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, readJson } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { normalizeIndianPhone } from "@/lib/phone";
import { clientIp, take } from "@/lib/rateLimit";

const Body = z.object({
  phone: z.string().transform((p, ctx) => {
    const normalized = normalizeIndianPhone(p);
    if (!normalized) ctx.addIssue({ code: "custom", message: "Enter a 10-digit Indian mobile number." });
    return normalized ?? "";
  }),
  password: z.string().min(1, "Enter your password.").max(128),
});

const WRONG = "That number and password don't match.";

// Phone + password; returns the latest interview to continue.
export async function POST(req: Request) {
  return handle("login", async () => {
    if (!take(`login:ip:${clientIp(req)}`, 30, 1 / 2)) {
      throw new HttpError(429, "Too many attempts from this network. Please wait a moment.");
    }
    const body = await readJson(req, Body);
    if (!take(`login:phone:${body.phone}`, 5, 1 / 60)) {
      throw new HttpError(429, "Too many attempts for this number. Please wait a minute.");
    }

    const [user] = await query<{ id: string; password_hash: string | null }>(
      "select id, password_hash from users where phone = $1",
      [body.phone],
    );
    const ok = user?.password_hash ? await verifyPassword(body.password, user.password_hash) : false;
    if (!user || !ok) {
      await logEvent({ actor: "user", type: "login_failed", userId: user?.id, payload: { ...requestMeta(req) } });
      throw new HttpError(401, WRONG);
    }

    const [latest] = await query<{ id: string }>(
      "select id from sessions where user_id = $1 order by created_at desc limit 1",
      [user.id],
    );
    await logEvent({
      actor: "user",
      type: "user_logged_in",
      userId: user.id,
      sessionId: latest?.id,
      payload: { ...requestMeta(req) },
    });
    if (!latest) throw new HttpError(404, "No interviews yet. Start one from the home page.");
    return json({ sessionId: latest.id });
  });
}
