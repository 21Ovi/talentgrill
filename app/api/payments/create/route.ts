import { z } from "zod";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, readJson } from "@/lib/http";
import { paymentsClient, type PaymentsClient } from "@/lib/integrations/pinelabs";
import { take } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";

const Body = z.object({ sessionId: z.uuid("Session not found.") });

// The amount always comes from server config, never from the client.
export async function POST(req: Request) {
  return handle("payment", async () => {
    const { sessionId } = await readJson(req, Body);
    if (!take(`pay:session:${sessionId}`, 5, 1 / 30)) {
      throw new HttpError(429, "Too many payment attempts. Please wait a few seconds and try again.");
    }
    const s = await loadSession(sessionId);
    if (!s) throw new HttpError(404, "Session not found.");
    if (s.isPro) throw new HttpError(409, "This interview is already unlocked.");
    if (s.next !== "upsell") throw new HttpError(409, "Finish the free questions first.");

    let client: PaymentsClient;
    try {
      client = paymentsClient();
    } catch {
      throw new HttpError(503, "Payments are being set up. Please try again in a few minutes.");
    }

    const amount = env().PRO_PRICE_PAISE;
    const [user] = await query<{ name: string; phone: string }>("select name, phone from users where id = $1", [s.userId]);
    const [payment] = await query<{ id: string }>(
      "insert into payments (user_id, session_id, amount_paise, env) values ($1, $2, $3, $4) returning id",
      [s.userId, sessionId, amount, client.env],
    );

    const callbackUrl = `${env().APP_BASE_URL}/api/payments/return?pid=${payment.id}`;
    const { orderId, redirectUrl } = await client.createCheckout({
      merchantRef: payment.id,
      amountPaise: amount,
      callbackUrl,
      customer: { firstName: user.name.split(" ")[0] ?? user.name, mobile: user.phone },
      notes: `TalentGrill Pro interview ${sessionId}`,
    });

    await query("update payments set pine_labs_order_id = $2 where id = $1", [payment.id, orderId]);
    await logEvent({
      actor: "user",
      type: "payment_created",
      userId: s.userId,
      sessionId,
      payload: { payment_id: payment.id, pine_labs_order_id: orderId, amount_paise: amount, env: client.env, mode: client.mode, ...requestMeta(req) },
    });
    return json({ checkoutUrl: redirectUrl, paymentId: payment.id });
  });
}
