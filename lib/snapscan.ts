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

export function createSnapscanPaymentUrl(reference: string, amountCents: number, returnPath: string) {
  const url = new URL(process.env.SNAPSCAN_PAYMENT_URL || snapscanPaymentUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'pos.snapscan.io' || !/^\/qr\/[a-zA-Z0-9_-]+$/.test(url.pathname)) {
    throw new Error('Invalid SnapScan payment URL');
  }
  const site = new URL(process.env.OCCENTRA_PUBLIC_URL || occentraPublicUrl);
  if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash) throw new Error('Invalid public website URL');
  const base = site.origin + returnPath;
  url.search = '';
  url.searchParams.set('id', reference);
  url.searchParams.set('amount', String(amountCents));
  url.searchParams.set('strict', 'true');
  url.searchParams.set('s_url', base + (base.includes('?') ? '&' : '?') + 'payment=returned&provider=snapscan');
  url.searchParams.set('f_url', base + (base.includes('?') ? '&' : '?') + 'payment=failed&provider=snapscan');
  url.searchParams.set('r_url', base + (base.includes('?') ? '&' : '?') + 'payment=returned&provider=snapscan');
  return url.toString();
}

export type SnapscanPayment = {
  id: number;
  status: string;
  totalAmount: number;
  requiredAmount: number | null;
  merchantReference: string | null;
  transactionType: string;
};

export function isMatchingSnapscanPayment(payment: SnapscanPayment, reference: string, amountCents: number) {
  return Number.isSafeInteger(payment.id) && payment.id > 0 &&
    payment.status === 'completed' && payment.transactionType === 'payment' &&
    payment.merchantReference === reference &&
    payment.totalAmount === amountCents && payment.requiredAmount === amountCents;
}

/** SnapScan signs the original, URL-encoded request body, not the parsed payload. */
export function isAuthenticSnapscanWebhook(rawBody: string, authorization: string | null, key: string) {
  if (!key || !authorization || !/^SnapScan signature=[a-f0-9]{64}$/i.test(authorization)) return false;
  const received = Buffer.from(authorization.slice('SnapScan signature='.length), 'hex');
  const expected = createHmac('sha256', key).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}
