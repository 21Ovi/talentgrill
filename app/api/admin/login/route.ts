import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminConfig, issueAdminToken, passwordMatches } from "@/lib/admin";
import { env } from "@/lib/env";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, readJson } from "@/lib/http";
import { clientIp, take } from "@/lib/rateLimit";

const Body = z.object({ password: z.string().min(1, "Enter the admin password.").max(200) });

export async function POST(req: Request) {
  return handle("admin_login", async () => {
    if (!adminConfig()) {
      throw new HttpError(503, "Admin isn't set up yet: add ADMIN_PASSWORD and ADMIN_COOKIE_SECRET on Render.");
    }
    // Five tries, then one more a minute: slow enough to make guessing pointless.
    if (!take(`admin:ip:${clientIp(req)}`, 5, 1 / 60)) {
      throw new HttpError(429, "Too many attempts. Wait a minute, then try again.");
    }
    const { password } = await readJson(req, Body);
    if (!passwordMatches(password)) {
      await logEvent({ actor: "system", type: "admin_login_failed", payload: requestMeta(req) });
      throw new HttpError(401, "That password isn't right.");
    }

    await logEvent({ actor: "admin", type: "admin_logged_in", payload: requestMeta(req) });
    (await cookies()).set(ADMIN_COOKIE, issueAdminToken(), {
      httpOnly: true,
      secure: env().NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_SECONDS,
    });
    return json({ ok: true });
  });
}
