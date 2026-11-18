/**
 * Every failure in the payment pipeline gets a stable code. Routes use it to tell
 * the browser whether retrying can help, and the logs use it to show the real cause.
 * Messages here are customer-safe; never put keys, tokens or raw provider bodies in them.
 */
export type SnapscanFailureCode =
  | 'not_configured'
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'upstream_auth'
  | 'upstream_bad_response'
  | 'database_unavailable'
  | 'database_rejected'
  | 'order_mismatch'
  | 'order_closed'
  | 'payment_id_conflict'
  | 'payment_not_confirmed';

const retryableCodes = new Set<SnapscanFailureCode>([
  'upstream_rate_limited', 'upstream_unavailable', 'upstream_auth', 'upstream_bad_response',
  'database_unavailable', 'not_configured', 'payment_not_confirmed',
]);

export class SnapscanError extends Error {
  readonly code: SnapscanFailureCode;
  readonly retryAfterSeconds?: number;
  /** Safe diagnostic detail for server logs only (HTTP status, Postgres code). */
  readonly detail?: string;
  constructor(code: SnapscanFailureCode, detail?: string, retryAfterSeconds?: number) {
    super(code + (detail ? ': ' + detail : ''));
    this.name = 'SnapscanError';
    this.code = code;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
  }
  get retryable() { return retryableCodes.has(this.code); }
}

/** Postgres codes that mean "this exact write will never succeed", so retrying is pointless. */
const permanentPostgresCodes = new Set(['23505', '23514', '23502', '23503', 'P0001', '42501', '42703', '42P01']);

export function fromDatabaseError(error: unknown): SnapscanError {
  const code = error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string'
    ? (error as { code: string }).code : 'unknown';
  if (code === '23505') return new SnapscanError('payment_id_conflict', 'postgres ' + code);
  return new SnapscanError(permanentPostgresCodes.has(code) ? 'database_rejected' : 'database_unavailable', 'postgres ' + code);
}

export function asSnapscanError(error: unknown): SnapscanError {
  if (error instanceof SnapscanError) return error;
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
    return fromDatabaseError(error);
  }
  return new SnapscanError('upstream_unavailable', error instanceof Error ? error.name : 'unknown');
}

const customerMessages: Record<SnapscanFailureCode, string> = {
  not_configured: 'Payment verification is not available yet. Your payment is safe; please try again shortly.',
  upstream_rate_limited: 'SnapScan is busy. Your payment is safe; we are checking again automatically.',
  upstream_unavailable: 'We could not reach SnapScan just now. Your payment is safe; we are checking again automatically.',
  upstream_auth: 'Payment verification is temporarily unavailable. Your payment is safe; please try again shortly.',
  upstream_bad_response: 'Payment verification is temporarily unavailable. Your payment is safe; please try again shortly.',
  database_unavailable: 'Payment verification is temporarily unavailable. Your payment is safe; please try again shortly.',
  database_rejected: 'This order could not be updated automatically. Please contact Occentra support with your order number.',
  order_mismatch: 'This order does not match the product it was created for. Please contact Occentra support with your order number.',
  order_closed: 'This order is no longer open for payment. If you were charged, contact Occentra support with your order number.',
  payment_id_conflict: 'This SnapScan payment is already linked to a different order. Please contact Occentra support with your order number.',
  payment_not_confirmed: 'Your payment was found but could not be saved yet. We are checking again automatically.',
};

export function describeSnapscanFailure(error: unknown) {
  const failure = asSnapscanError(error);
  const status = failure.retryable ? 503 : 409;
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (failure.retryable) headers['Retry-After'] = String(failure.retryAfterSeconds ?? 5);
  return {
    failure, status, headers,
    body: { error: customerMessages[failure.code], code: failure.code, retryable: failure.retryable },
    /** Safe to log: code, retry flag and the HTTP or Postgres status only. */
    log: { code: failure.code, retryable: failure.retryable, detail: failure.detail ?? null },
  };
}
