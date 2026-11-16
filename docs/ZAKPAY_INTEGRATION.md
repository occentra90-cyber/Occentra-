# Occentra / Zak Pay integration preparation

Status: **NOT LIVE** (merchant verification pending as of 2026-11-16).
This branch is a preparation only. It must not be promoted or presented as a working Zak Pay checkout.

## Existing Occentra payment architecture

- Next.js App Router on Vercel; Supabase stores `purchases` and `guest_designs`.
- The website currently uses `/api/payfast/checkout` and `/api/payfast/notify`.
- CV templates cost **R20.00** (2,000 cents); cover letters cost **R15.00** (1,500 cents).
- Checkout already saves a guest draft and receives a private 64-character token.
- Existing `/api/payfast/status` checks the stored purchase and locked design, not the browser's return URL alone.
- Do not disable or rewrite Payfast during Zak Pay onboarding.

## What is prepared in this branch

1. `/api/zakpay/checkout` and `/api/zakpay/notify` are explicit **503/disabled** stubs: no external charge and no database status update can occur.
2. `supabase/migrations/20261116_zakpay_prepare.sql` adds provider identifiers to purchases while retaining legacy Payfast columns and the Payfast default.
3. `.env.example` records the anticipated configuration fields without credentials.

> The public Zak Pay site advertises online payment links and APIs, but its marketing integration examples do not establish the exact API request/response fields, webhook signature rules or transaction verification endpoint. Never invent these. Also do not confuse South African **Zak Pay** (`zakpay.co.za`) with Indian **Zaakpay** (`zaakpay.com`).

## Information to request from Zak Pay before coding live integration

Contact **support@zakpay.co.za** from the account's registered email and request:

- Confirmation that Occentra can use hosted checkout/API checkout and which merchant account is enabled.
- Current **official API documentation**, API base URLs (sandbox and live), authentication method, exact amounts units, currency format and payment-session response shape.
- Sandbox merchant credentials, test cards/payment methods, and permitted test domains.
- Checkout success/cancel URLs, webhook registration UI and a verified list of payment states.
- Webhook signature headers, signing algorithm, signed raw message format, timestamp/replay protection, retry policy and sample signed payload.
- A server-to-server transaction lookup/status endpoint and a way to verify the payment amount, currency, merchant reference and provider transaction ID.
- Supported idempotency mechanism for checkout/session creation and webhook deduplication.
- Chargebacks, refunds, settlement, and online fees applicable to an R15 / R20 digital-download product.

Do not share merchant secret keys in email, screenshots, commits, support tickets or chat. Store credentials in Vercel Production **Secret** variables after verification; keep sandbox and production values separate.

## Integration design after official documentation arrives

1. Browser saves the customer's CV/cover-letter draft using the existing guest-design endpoint.
2. Server validates the draft's hashed token, template ID, expiry and `draft` state. Prices are **server-controlled**: `cv-0`…`cv-5` = 2000 cents; `cover-*` = 1500 cents. Never accept a client-provided amount.
3. Server inserts a unique `purchases` row with `provider='zakpay'` and `status='pending'` and links it to the guest draft.
4. Server creates a Zak Pay payment session with that merchant reference, exact ZAR amount, idempotency key, secure hosted return URL and verified webhook callback. Store the provider session ID. Return only the approved hosted checkout URL to the browser.
5. Browser redirects to Zak Pay. A success redirect is **informational only**; never mark the purchase as paid from a query parameter or a customer-supplied receipt/screenshot.
6. Webhook handler reads the raw payload, verifies Zak Pay's **documented** signature and replay window, and independently confirms the provider transaction server-to-server where supported. Match merchant ID, currency ZAR, expected amount, unique merchant reference and provider transaction ID.
7. Idempotently mark the purchase `paid` and lock the matching `guest_designs` record only after all checks pass; make retries safe. Prefer a single database transaction/RPC for the two status updates, so there is no paid-but-unlocked inconsistency. A paid design must never become editable again.
8. Existing purchase-status polling must be made provider-neutral (`/api/payments/status`, with compatibility for the current `/api/payfast/status` callers). Status response comes exclusively from Supabase's verified state.
9. Failed, cancelled, refunded, mismatched, expired, unsigned and repeated notifications must **never** grant downloads.

### Callback URLs to register (only once approved and implemented)

- Webhook: `https://occentra.vercel.app/api/zakpay/notify`
- Success and cancel URLs: use the existing home/cover-letter private-design return patterns, but build URLs using a reviewed `OCCENTRA_BASE_URL` and only the public canonical domain.
- Confirm the production hostname in Vercel's domain settings first; do not use ephemeral preview domains or insert secrets into URLs.

## Proposed environment variables

```dotenv
# Set to true ONLY after live API integration, webhook verification,
# migrations and full sandbox tests have all been completed.
ZAKPAY_ENABLED=false
ZAKPAY_API_KEY=
ZAKPAY_WEBHOOK_SECRET=
ZAKPAY_API_BASE_URL=
OCCENTRA_BASE_URL=https://occentra.vercel.app
```

These are **provisional names**, not a claim about Zak Pay's actual credential format. The current 503 stubs deliberately remain disabled even if `ZAKPAY_ENABLED` is changed. Do not flip the flag to enable payment until the implementation is finished.

## Database migration

Run the SQL in `supabase/migrations/20261116_zakpay_prepare.sql` in the correct Supabase project **after review and backup**. It is additive: existing Payfast purchase rows keep `provider='payfast'` and their `payfast_payment_id`. Do not run this migration solely to enable unfinished checkout.

## Launch checklist

- [ ] Merchant verification approved and Zak Pay confirms API access.
- [ ] Official current API + webhook specification received.
- [ ] Server secrets installed in Vercel, scoped per environment.
- [ ] SQL migration tested in staging and applied to production.
- [ ] Create-session code implements safe retries and session expiry.
- [ ] Signed webhook and/or server-side transaction verification implemented and audited.
- [ ] Database payment/unlock transitions are atomic and idempotent.
- [ ] CV R20 and cover-letter R15 test payment both unlock the correct download.
- [ ] Wrong amount, wrong currency, forged webhook, duplicate callback, expired guest draft, cancellation and refunds cannot unlock a download.
- [ ] Mobile return flow and payment status refresh tested.
- [ ] Existing Payfast checkout still works unchanged.
- [ ] Production approval and smoke test completed before enabling any Zak Pay button.

## Reference

Public Zak Pay site: https://www.zakpay.co.za/
Zak Pay merchant support: support@zakpay.co.za
