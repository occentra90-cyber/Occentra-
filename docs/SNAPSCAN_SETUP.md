# SnapScan checkout setup for Occentra

This integration uses the existing Next.js/Vercel site and Supabase database; it does **not** require WordPress, WooCommerce or extra hosting. The payment link is public, but an authenticated SnapScan merchant API key is essential to verify payment before unlocking downloads.

## Before enabling payments

1. Ask SnapScan merchant support for a developer API key for the verified Occentra merchant account, and confirm that `https://pos.snapscan.io/qr/QnQsqROg` supports URL parameters `id`, `amount`, `strict`, `s_url`, and `f_url`. The payment URL is the existing public merchant Payment Link, not an API secret.
2. Run `supabase/migrations/20261117_snapscan.sql` once in the **correct Occentra Supabase project's** SQL editor. It adds a payment-provider column and a unique SnapScan transaction ID to existing purchases.
3. In Vercel project settings, add `SNAPSCAN_API_KEY` as a **production Secret** (never as `NEXT_PUBLIC_...`). Set `SNAPSCAN_PAYMENT_URL` to the confirmed merchant QR URL; the existing URL is the default. Existing Supabase environment variables must remain available.
4. Test a real checkout end-to-end for a CV (R20), including an interrupted payment, refreshing the private design link, and a completed payment. The status endpoint must receive a completed payment from SnapScan's authenticated `/merchant/api/v1/payments?merchantReference=...` endpoint with the **exact** order reference and amount. The customer must remain locked until this happens. Never test by pretending a redirect proves payment.
5. Only after those checks, set `SNAPSCAN_CHECKOUT_ENABLED=true` in Vercel's production environment and redeploy. The SnapScan button appears automatically beside Payfast for CVs and cover letters.

## Security and scope

- The server generates the amount in cents and a random order reference. Checkout uses `strict=true` to prevent underpayment or reuse of a reference on SnapScan's side.
- A return to Occentra is not evidence of payment. The server queries the authenticated SnapScan API, matches `merchantReference`, `requiredAmount`, `totalAmount`, transaction status and type, and records the unique transaction ID before unlocking the saved design.
- Customers' private design tokens are stored in browser session storage before redirecting and restored only after returning to Occentra. They are not appended to the merchant payment URL or the redirect URL.
- If the API key, database or payment status is unavailable, checkout stays disabled or access stays locked. Refreshing a private design link allows rechecking; pending purchases should not be repaid before reconciling them.
- Currently, the actual working editors are CV templates (R20) and cover letters (R15). The planned invitation categories will require their own working editor and fulfillment flow before accepting payments.
- Refunds and payment disputes need a separate operator process; they are not automatically revoked by this integration.

SnapScan documentation: https://developer.getsnapscan.com/docs/creating-a-url/ and https://developer.getsnapscan.com/docs/get-all-payments/.
