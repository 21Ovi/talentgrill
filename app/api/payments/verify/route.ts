import { query } from "@/lib/db";
import { handle, HttpError, isUuid, json, notFound } from "@/lib/http";
import { paymentsClient } from "@/lib/integrations/pinelabs";
import { applyOrderStatus, type PaymentRow } from "@/lib/payments";

// Checks the order with Pine Labs server-side. The redirect alone is never trusted.
export async function GET(req: Request) {
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  if (!isUuid(pid)) return notFound("Payment");
  return handle("payment_verify", async () => {
    const [p] = await query<PaymentRow>("select * from payments where id = $1", [pid]);
    if (!p) throw new HttpError(404, "Payment not found.");

    let status = p.status;
    if (status !== "SUCCESS" && p.pine_labs_order_id) {
      const order = await paymentsClient().getOrder(p.pine_labs_order_id);
      status = await applyOrderStatus(p.id, order, { actor: "system", via: "verify" });
    }
    return json({ status, sessionId: p.session_id });
  });
}
