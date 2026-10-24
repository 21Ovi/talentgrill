import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdmin } from "@/lib/admin";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, json } from "@/lib/http";

export async function POST(req: Request) {
  return handle("admin_logout", async () => {
    if (await isAdmin()) await logEvent({ actor: "admin", type: "admin_logged_out", payload: requestMeta(req) });
    (await cookies()).delete(ADMIN_COOKIE);
    return json({ ok: true });
  });
}
