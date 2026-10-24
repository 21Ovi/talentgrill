import { z } from "zod";
import { query } from "@/lib/db";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, readJson } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizeIndianPhone } from "@/lib/phone";
import { clientIp, take } from "@/lib/rateLimit";

const Body = z
  .object({
    phone: z.string().transform((p, ctx) => {
      const normalized = normalizeIndianPhone(p);
      if (!normalized) ctx.addIssue({ code: "custom", message: "Enter a 10-digit Indian mobile number." });
      return normalized ?? "";
    }),
    currentPassword: z.string().min(1).max(128),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters for your new password.")
      .max(128, "Please use a shorter password."),
  })
  .refine((b) => b.newPassword !== b.currentPassword, {
    message: "Choose a new password, not the temporary one.",
    path: ["newPassword"],
  });

// Changes a password given the current one; clears the temporary-password flag.
export async function POST(req: Request) {
  return handle("password_change", async () => {
    if (!take(`password:ip:${clientIp(req)}`, 30, 1 / 2)) {
      throw new HttpError(429, "Too many attempts from this network. Please wait a moment.");
    }
    const body = await readJson(req, Body);
    if (!take(`password:phone:${body.phone}`, 5, 1 / 60)) {
      throw new HttpError(429, "Too many attempts for this number. Please wait a minute.");
    }
    const [user] = await query<{ id: string; password_hash: string | null; password_must_change: boolean }>(
      "select id, password_hash, password_must_change from users where phone = $1",
      [body.phone],
    );
    if (!user?.password_hash || !(await verifyPassword(body.currentPassword, user.password_hash))) {
      throw new HttpError(401, "That number and password don't match.");
    }

    await query("update users set password_hash = $2, password_must_change = false where id = $1", [
      user.id,
      await hashPassword(body.newPassword),
    ]);
    const [latest] = await query<{ id: string }>(
      "select id from sessions where user_id = $1 order by created_at desc limit 1",
      [user.id],
    );
    await logEvent({
      actor: "user",
      type: "password_changed",
      userId: user.id,
      sessionId: latest?.id,
      payload: { was_temporary: user.password_must_change, ...requestMeta(req) },
    });
    if (!latest) throw new HttpError(404, "No interviews yet. Start one from the home page.");
    return json({ sessionId: latest.id });
  });
}
