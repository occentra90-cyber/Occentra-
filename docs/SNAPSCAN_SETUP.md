# Occentra — SnapScan replacing Payfast

Occentra is the existing Next.js site hosted on Vercel. SnapScan is the **only provider for new checkouts**. Legacy Payfast payment-status and notification endpoints remain available solely to settle earlier orders; `/api/payfast/checkout` rejects new orders.

The published live site must not be switched to this code until SnapScan credentials, the migration and a real test are ready. The checkout feature flag stays **off by default** and the UI clearly displays when payments are unavailable.

## Launch checklist

1. Ask SnapScan to rotate the API key and Webhook Authentication Key that appeared in the shared screenshot. Never paste them into source code, pull request comments, or a public chat. Store the replacement values as Vercel **Secrets** `SNAPSCAN_API_KEY` and `SNAPSCAN_WEBHOOK_AUTH_KEY`, scoped to production. Do not use `NEXT_PUBLIC_` for secrets.
2. Confirm that the merchant SnapCode at `https://pos.snapscan.io/qr/QnQsqROg` belongs to Occentra, supports the documented `id`, `amount`, `strict`, `s_url`, `f_url` and `r_url` parameters, and is attached to the same merchant account as the API key.
3. Run `supabase/migrations/20261117_snapscan.sql` in the existing Occentra Supabase project. This adds `payment_provider` and a unique `snapscan_payment_id` to `purchases`. Do **not** run it on the wrong database. The previous cover-letter migration must already be present if R15 cover letters are sold.
4. In Vercel, set `SNAPSCAN_PAYMENT_URL` to the confirmed public QR URL and `OCCENTRA_PUBLIC_URL=https://occentra-occentra.vercel.app`. Add the rotated secrets. Leave `SNAPSCAN_CHECKOUT_ENABLED=false` during setup.
5. Ask SnapScan merchant support to register this webhook destination for the Occentra merchant: `https://occentra-occentra.vercel.app/api/snapscan/webhook`. The route verifies SnapScan's HMAC signature using the webhook key, then makes an **independent authenticated API query** before it marks an order paid. A customer return URL does not prove payment.
6. On an isolated preview/test configuration, run a real R20 CV and R15 cover-letter checkout, including failed/cancelled payment, repeated status requests, refresh after payment, duplicate notifications, and a completed payment. Confirm that the design stays locked until the verified matching transaction is stored. Avoid sending real customer payments through an unverified integration.
7. When database schema, API responses and notifications are verified, set `SNAPSCAN_CHECKOUT_ENABLED=true` for production and redeploy **the reviewed SnapScan branch**. Confirm that new Payfast checkouts return HTTP 410 and the UI displays only SnapScan. Check the production webhook and status logs after launch.

## Payment security

- The server computes prices (R20 for CVs, R15 for cover letters) and creates an unguessable order reference. SnapScan receives the correct fixed amount in cents and `strict=true`.
- On a webhook, SnapScan supplies the URL-encoded `payload`. We verify the HMAC-SHA256 signature against the **unchanged raw body** with a constant-time comparison. Unsigned or malformed requests cannot mark an order paid.
- Both `/api/snapscan/webhook` and `/api/snapscan/status` independently query SnapScan's authenticated API for the completed payment, match reference and amount, and store its transaction ID. The database unique index prevents one transaction from unlocking multiple purchases.
- A payment return restores the customer's private design token from browser session storage; the token is not sent to the payment provider. The server checks the token hash and expiry before displaying a purchased design.
- Only real working CV and cover-letter editors are currently eligible for checkout. Planned Baby Shower, Wedding and Birthday invitations need working editors and fulfillment first.
- SnapScan status checks remain available for prior purchases even if new checkouts are disabled. Legacy Payfast notifications remain enabled for historical orders.

Official references: [SnapScan URL parameters](https://developer.getsnapscan.com/docs/creating-a-url/), [webhook signatures](https://developer.getsnapscan.com/docs/webhooks/), [API authentication](https://developer.getsnapscan.com/docs/authentication/), and [payment lookup](https://developer.getsnapscan.com/docs/get-all-payments/).
