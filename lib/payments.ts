import { tx } from "./db";
import { logEvent, type Actor } from "./events";
import type { Order } from "./integrations/pinelabs";

export type PaymentRow = {
  id: string;
  user_id: string;
  session_id: string;
  amount_paise: number;
  env: "sandbox" | "live";
  pine_labs_order_id: string | null;
  status: "CREATED" | "PENDING" | "SUCCESS" | "FAILED";
};

/**
 * Applies an order status we trust (a server-side Get Order call or a signed
 * webhook). Idempotent: SUCCESS is terminal, and only the first transition
 * unlocks Pro and writes events. Returns the payment's resulting status.
 */
export async function applyOrderStatus(
  paymentId: string,
  order: Order,
  source: { actor: Actor; via: "verify" | "webhook"; raw?: unknown },
): Promise<PaymentRow["status"]> {
  return tx(async (db) => {
    const { rows } = await db.query<PaymentRow>("select * from payments where id = $1 for update", [paymentId]);
    const p = rows[0];
    if (!p) throw new Error(`payment ${paymentId} not found`);
    if (p.status === "SUCCESS") return p.status;

    const raw = source.raw === undefined ? null : JSON.stringify(source.raw);
    const ctx = { userId: p.user_id, sessionId: p.session_id };
    const detail = { payment_id: p.id, pine_labs_order_id: order.orderId, raw_status: order.rawStatus, via: source.via };

    if (order.status === "SUCCESS") {
      if (order.amountPaise !== null && order.amountPaise !== p.amount_paise) {
        await logEvent(
          { actor: "system", type: "payment_amount_mismatch", ...ctx, payload: { ...detail, expected: p.amount_paise, got: order.amountPaise } },
          db,
        );
        return p.status;
      }
      await db.query(
        `update payments set status = 'SUCCESS', pine_labs_payment_id = $2, verified_at = now(),
                raw_webhook = coalesce($3::jsonb, raw_webhook)
          where id = $1`,
        [p.id, order.paymentId, raw],
      );
      await db.query("update sessions set is_pro = true where id = $1", [p.session_id]);
      await logEvent(
        { actor: source.actor, type: "payment_succeeded", ...ctx, payload: { ...detail, amount_paise: p.amount_paise, env: p.env } },
        db,
      );
      await logEvent({ actor: "system", type: "session_unlocked_pro", ...ctx, payload: { payment_id: p.id } }, db);
      return "SUCCESS";
    }

    if (order.status === "FAILED" && p.status !== "FAILED") {
      await db.query("update payments set status = 'FAILED', raw_webhook = coalesce($2::jsonb, raw_webhook) where id = $1", [p.id, raw]);
      await logEvent({ actor: source.actor, type: "payment_failed", ...ctx, payload: detail }, db);
      return "FAILED";
    }

    if (order.status === "PENDING" && p.status === "CREATED") {
      await db.query("update payments set status = 'PENDING' where id = $1", [p.id]);
    }
    return order.status === "PENDING" ? "PENDING" : p.status;
  });
}
