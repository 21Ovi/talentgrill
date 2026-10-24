# Pine Labs Online (Plural): what we use

Source: https://www.pinelabs.com/docs/online-payments (each page also has a `.md` version).
Adapter: `lib/integrations/pinelabs.ts`.

| | Production | UAT (sandbox) |
|---|---|---|
| Base URL | `https://api.pluralpay.in` | `https://pluraluat.v2.pinepg.in` |
| Dashboard | https://dashboardv2.pluralonline.com | same |

## Calls

1. **Token**: `POST /api/auth/v1/token` with `{client_id, client_secret, grant_type: "client_credentials"}`
   → `{access_token, expires_at}`. Sent as `Authorization: Bearer …`. We cache it until a minute before expiry.
2. **Hosted checkout**: `POST /api/checkout/v1/orders` with `merchant_order_reference` (our `payments.id`,
   Pine Labs' idempotency key), `order_amount: {value (paise, min 100), currency: "INR"}`,
   `integration_mode: "REDIRECT"`, `callback_url`, `purchase_details.customer` → `{order_id, redirect_url}`.
3. **Order status**: `GET /api/pay/v1/orders/{order_id}` → `data.status`:
   `PROCESSED`/`SETTLED` = paid; `FAILED`/`CANCELLED` = failed; everything else = pending.
   Every request also sends `Request-ID` (GUID) and `Request-Timestamp` (ISO 8601).

## Webhooks

- The URL is set up by Pine Labs support (pgsupport@pinelabs.com) or the Pine Labs team on site.
  Ours: `https://<app>/api/webhooks/pinelabs`.
- Headers `webhook-id`, `webhook-timestamp` (unix seconds), `webhook-signature` (base64).
  Signature = base64(HMAC-SHA256(base64decode(secret), `${id}.${timestamp}.${rawBody}`)).
  The secret is under Settings in the dashboard → `PINELABS_WEBHOOK_SECRET`.
- Events we act on: `ORDER_*` (e.g. `ORDER_PROCESSED`, `ORDER_FAILED`, `ORDER_CANCELLED`). Payload
  `data` has the same shape as Get Order. Up to 3 retries.
- Sender IPs (production): 18.61.136.235, 40.192.21.254, 18.60.11.185, 13.200.147.61, 13.201.195.80/28.

## Env

`PINELABS_MODE` (live|stub), `PINELABS_ENV` (uat|production), `PINELABS_CLIENT_ID`,
`PINELABS_CLIENT_SECRET`, `PINELABS_WEBHOOK_SECRET`. Only `PINELABS_ENV=production` payments
are recorded as `env='live'` and count as paying users.
