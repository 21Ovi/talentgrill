import { query } from "@/lib/db";
import { logError, logEvent } from "@/lib/events";
import { json } from "@/lib/http";
import { parseOrder, verifyWebhookSignature } from "@/lib/integrations/pinelabs";
import { applyOrderStatus } from "@/lib/payments";

// Source of truth for payment status. Signature-verified, idempotent by order.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(req.headers, raw)) {
    await logError("pinelabs_webhook", new Error("invalid or missing webhook signature"), {
      payload: { webhook_id: req.headers.get("webhook-id") },
    });
    return json({ error: "invalid signature" }, 401);
  }

  try {
    const body = JSON.parse(raw) as { event_type?: string; data?: unknown };
    await logEvent({
      actor: "webhook",
      type: "pinelabs_webhook_received",
      payload: { webhook_id: req.headers.get("webhook-id"), event_type: body.event_type ?? null },
    });
    // Order events carry the order's final state. PAYMENT_FAILED is skipped: the
    // customer can still retry and succeed on the same checkout order.
    if (!body.data || !String(body.event_type ?? "").startsWith("ORDER_")) {
      return json({ ok: true, ignored: true });
    }

    const order = parseOrder(body.data);
    const [p] = await query<{ id: string }>(
      "select id from payments where pine_labs_order_id = $1 or id::text = $2 limit 1",
      [order.orderId, order.merchantRef ?? ""],
    );
    if (!p) {
      await logError("pinelabs_webhook", new Error(`no payment for order ${order.orderId}`));
      return json({ ok: true, ignored: true });
    }
    await applyOrderStatus(p.id, order, { actor: "webhook", via: "webhook", raw: body });
    return json({ ok: true });
  } catch (err) {
    await logError("pinelabs_webhook", err);
    // 500 so Pine Labs retries; processing is idempotent.
    return json({ error: "processing failed" }, 500);
  }
}
