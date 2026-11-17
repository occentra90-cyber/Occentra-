import { createHmac, timingSafeEqual } from 'node:crypto';

/** SnapScan parameters and values are created only on the server. */
export const snapscanPaymentUrl = 'https://pos.snapscan.io/qr/QnQsqROg';
export const occentraPublicUrl = 'https://occentra-occentra.vercel.app';

export function snapscanVerificationConfigured() {
  return Boolean(process.env.SNAPSCAN_API_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function snapscanConfigured() {
  return process.env.SNAPSCAN_CHECKOUT_ENABLED === 'true' &&
    Boolean(process.env.SNAPSCAN_WEBHOOK_AUTH_KEY) && snapscanVerificationConfigured();
}

export function createSnapscanPaymentUrl(reference: string, amountCents: number, returnPath: string, returnOrigin?: string) {
  const url = new URL(process.env.SNAPSCAN_PAYMENT_URL || snapscanPaymentUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'pos.snapscan.io' || !/^\/qr\/[a-zA-Z0-9_-]+$/.test(url.pathname)) {
    throw new Error('Invalid SnapScan payment URL');
  }
  const site = new URL(process.env.OCCENTRA_PUBLIC_URL || occentraPublicUrl);
  if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash) throw new Error('Invalid public website URL');
  // Return to the exact trusted hostname where the user began checkout so
  // their browser can recover the private design token saved before payment.
  const trustedOrigins = new Set([site.origin, 'https://occentra.vercel.app', 'https://occentra-occentra.vercel.app']);
  if (returnOrigin && !trustedOrigins.has(returnOrigin)) throw new Error('Invalid payment return origin');
  const base = (returnOrigin || site.origin) + returnPath;
  url.search = '';
  url.searchParams.set('id', reference);
  url.searchParams.set('amount', String(amountCents));
  url.searchParams.set('strict', 'true');
  // SnapScan limits SnapCode URLs to 256 characters. A single fallback return
  // works for both outcomes; we independently verify payment after returning.
  const carriesOrder = /[?&]o=[a-f0-9-]{36}(&|$)/i.test(returnPath);
  url.searchParams.set('r_url', carriesOrder ? base : base + (base.includes('?') ? '&' : '?') + 'payment=returned&provider=snapscan');
  const checkoutUrl = url.toString();
  if (checkoutUrl.length > 256) throw new Error('SnapScan checkout URL is too long');
  return checkoutUrl;
}

export type SnapscanPayment = {
  id: number;
  status: string;
  totalAmount: number;
  requiredAmount: number | null;
  merchantReference: string | null;
  transactionType: string;
  tipAmount?: number | null;
};

export function isMatchingSnapscanPayment(payment: SnapscanPayment, reference: string, amountCents: number) {
  const tip = payment.tipAmount ?? 0;
  return Number.isSafeInteger(payment.id) && payment.id > 0 &&
    payment.status === 'completed' && payment.transactionType === 'payment' &&
    payment.merchantReference === reference && payment.requiredAmount === amountCents &&
    Number.isSafeInteger(payment.totalAmount) && Number.isSafeInteger(tip) && tip >= 0 &&
    payment.totalAmount - tip >= amountCents;
}

/** SnapScan signs the original, URL-encoded request body, not the parsed payload. */
export function isAuthenticSnapscanWebhook(rawBody: string, authorization: string | null, key: string) {
  if (!key || !authorization || !/^SnapScan signature=[a-f0-9]{64}$/i.test(authorization)) return false;
  const received = Buffer.from(authorization.slice('SnapScan signature='.length), 'hex');
  const expected = createHmac('sha256', key).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}
