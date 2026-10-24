import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../env";
import { integrationMode, recordError, recordSuccess } from "./status";

// Pine Labs Online (Plural) hosted checkout. See docs/vendor/pinelabs.md.
const BASE_URL = {
  production: "https://api.pluralpay.in",
  uat: "https://pluraluat.v2.pinepg.in",
} as const;
const TIMEOUT_MS = 15_000;

/** Our payment status, mapped from Pine Labs' order status. */
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export type Order = {
  orderId: string;
  merchantRef: string | null;
  status: PaymentStatus;
  /** Pine Labs' raw order status, kept for the ledger. */
  rawStatus: string;
  amountPaise: number | null;
  paymentId: string | null;
};

export type CheckoutRequest = {
  /** Our payments.id: Pine Labs' idempotency key for the order. */
  merchantRef: string;
  amountPaise: number;
  callbackUrl: string;
  customer: { firstName: string; mobile: string };
  notes: string;
};

export interface PaymentsClient {
  mode: "live" | "stub";
  /** What payments.env records: only 'live' counts as a paying user. */
  env: "sandbox" | "live";
  createCheckout(req: CheckoutRequest): Promise<{ orderId: string; redirectUrl: string }>;
  getOrder(orderId: string): Promise<Order>;
}

export function paymentsClient(): PaymentsClient {
  return integrationMode("pinelabs") === "stub" ? stubClient : liveClient();
}

export function toPaymentStatus(raw: string): PaymentStatus {
  if (raw === "PROCESSED" || raw === "SETTLED") return "SUCCESS";
  if (raw === "FAILED" || raw === "CANCELLED") return "FAILED";
  return "PENDING"; // CREATED, PENDING, ATTEMPTED, AUTHORIZED
}

const OrderData = z.object({
  order_id: z.string(),
  merchant_order_reference: z.string().nullish(),
  status: z.string(),
  order_amount: z.object({ value: z.number() }).nullish(),
  payments: z.array(z.object({ id: z.string(), status: z.string().nullish() })).nullish(),
});

export function parseOrder(data: unknown): Order {
  const d = OrderData.parse(data);
  const paid = d.payments?.find((p) => p.status === "PROCESSED") ?? d.payments?.at(-1);
  return {
    orderId: d.order_id,
    merchantRef: d.merchant_order_reference ?? null,
    status: toPaymentStatus(d.status),
    rawStatus: d.status,
    amountPaise: d.order_amount?.value ?? null,
    paymentId: paid?.id ?? null,
  };
}

let token: { value: string; expiresAt: number } | null = null;

function liveClient(): PaymentsClient {
  const e = env();
  const base = BASE_URL[e.PINELABS_ENV];

  async function call(path: string, init: { method: string; body?: unknown; auth?: boolean }): Promise<unknown> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
      "Request-ID": randomUUID(),
      "Request-Timestamp": new Date().toISOString(),
    };
    if (init.auth !== false) headers.authorization = `Bearer ${await accessToken()}`;
    try {
      const res = await fetch(`${base}${path}`, {
        method: init.method,
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Pine Labs ${path} returned ${res.status}: ${text.slice(0, 300)}`);
      recordSuccess("pinelabs");
      return text ? JSON.parse(text) : {};
    } catch (err) {
      recordError("pinelabs", err);
      throw err;
    }
  }

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt - Date.now() > 60_000) return token.value;
    const res = z
      .object({ access_token: z.string(), expires_at: z.string().nullish() })
      .parse(
        await call("/api/auth/v1/token", {
          method: "POST",
          auth: false,
          body: { client_id: e.PINELABS_CLIENT_ID, client_secret: e.PINELABS_CLIENT_SECRET, grant_type: "client_credentials" },
        }),
      );
    const expiresAt = res.expires_at ? Date.parse(res.expires_at) : Date.now() + 30 * 60_000;
    token = { value: res.access_token, expiresAt };
    return token.value;
  }

  return {
    mode: "live",
    env: e.PINELABS_ENV === "production" ? "live" : "sandbox",
    async createCheckout(req) {
      const res = z
        .object({ order_id: z.string(), redirect_url: z.url() })
        .parse(
          await call("/api/checkout/v1/orders", {
            method: "POST",
            body: {
              merchant_order_reference: req.merchantRef,
              order_amount: { value: req.amountPaise, currency: "INR" },
              integration_mode: "REDIRECT",
              notes: req.notes,
              callback_url: req.callbackUrl,
              purchase_details: {
                customer: {
                  first_name: req.customer.firstName.slice(0, 50),
                  mobile_number: req.customer.mobile.replace(/^\+91/, ""),
                  country_code: "91",
                },
              },
            },
          }),
        );
      return { orderId: res.order_id, redirectUrl: res.redirect_url };
    },
    async getOrder(orderId) {
      const path = `/api/pay/v1/orders/${encodeURIComponent(orderId)}`;
      // Idempotent read: one retry on a network error or timeout.
      const res = await call(path, { method: "GET" }).catch(() => call(path, { method: "GET" }));
      return parseOrder(z.object({ data: z.unknown() }).parse(res).data);
    },
  };
}

/**
 * Pine Labs signs `${webhook-id}.${webhook-timestamp}.${raw body}` with
 * HMAC-SHA256 using the base64-decoded secret, and sends the base64 digest in
 * `webhook-signature` (possibly as space-separated `v1,<sig>` entries).
 */
export function verifyWebhookSignature(headers: Headers, rawBody: string): boolean {
  const secret = env().PINELABS_WEBHOOK_SECRET;
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signature = headers.get("webhook-signature");
  if (!secret || !id || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 10 * 60) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64"));
  return signature.split(" ").some((part) => {
    const candidate = Buffer.from(part.replace(/^v\d+,/, ""));
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

// Stub mode: local development and CI only. Checkout "succeeds" immediately and
// payments are recorded with env='sandbox', so they never count as revenue.
const stubOrders = new Map<string, Order>();

const stubClient: PaymentsClient = {
  mode: "stub",
  env: "sandbox",
  async createCheckout(req) {
    const orderId = `stub-${req.merchantRef}`;
    stubOrders.set(orderId, {
      orderId,
      merchantRef: req.merchantRef,
      status: "SUCCESS",
      rawStatus: "PROCESSED",
      amountPaise: req.amountPaise,
      paymentId: `${orderId}-pay`,
    });
    return { orderId, redirectUrl: req.callbackUrl };
  },
  async getOrder(orderId) {
    const order = stubOrders.get(orderId);
    if (!order) throw new Error(`stub order ${orderId} not found`);
    return order;
  },
};
