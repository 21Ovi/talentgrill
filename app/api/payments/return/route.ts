import { env } from "@/lib/env";
import { isUuid } from "@/lib/http";

// Pine Labs sends the customer back to callback_url, possibly as a form POST,
// which a page can't receive. Bounce to the return page, which verifies the
// payment server-side; nothing in this request is trusted.
async function bounce(req: Request): Promise<Response> {
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  const target = new URL("/checkout/return", env().APP_BASE_URL);
  if (isUuid(pid)) target.searchParams.set("pid", pid);
  return Response.redirect(target, 303);
}

export const GET = bounce;
export const POST = bounce;
