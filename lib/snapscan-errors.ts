export type SnapscanFailureCode = 'not_configured' | 'upstream_rate_limited' | 'upstream_unavailable' | 'upstream_auth' | 'upstream_bad_response' | 'database_unavailable' | 'database_rejected' | 'order_mismatch' | 'order_closed' | 'payment_id_conflict' | 'payment_not_confirmed';
const retryableCodes = new Set<SnapscanFailureCode>(['not_configured','upstream_rate_limited','upstream_unavailable','upstream_auth','upstream_bad_response','database_unavailable','payment_not_confirmed']);
export class SnapscanError extends Error {
  readonly code: SnapscanFailureCode;
  readonly detail?: string;
  readonly retryAfterSeconds?: number;
  constructor(code: SnapscanFailureCode, detail?: string, retryAfterSeconds?: number) {
    super(code + (detail ? ': ' + detail : ''));
    this.code = code;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = 'SnapscanError';
  }
  get retryable() { return retryableCodes.has(this.code); }
}
const permanent = new Set(['23505','23514','23502','23503','P0001','42501','42703','42P01']);
export function fromDatabaseError(error: unknown): SnapscanError {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'unknown';
  if (code === '23505') return new SnapscanError('payment_id_conflict','postgres '+code);
  return new SnapscanError(permanent.has(code) ? 'database_rejected' : 'database_unavailable','postgres '+code);
}
export function asSnapscanError(error: unknown): SnapscanError {
  if (error instanceof SnapscanError) return error;
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') return fromDatabaseError(error);
  return new SnapscanError('upstream_unavailable',error instanceof Error ? error.name : 'unknown');
}
const messages: Record<SnapscanFailureCode,string> = {
  not_configured:'Payment verification is not available yet. Please try again shortly.',
  upstream_rate_limited:'SnapScan is busy. Please try again shortly.',
  upstream_unavailable:'We could not reach SnapScan just now. Please try again shortly.',
  upstream_auth:'Payment verification is temporarily unavailable.',
  upstream_bad_response:'Payment verification is temporarily unavailable.',
  database_unavailable:'Payment verification is temporarily unavailable.',
  database_rejected:'This order could not be updated automatically. Please contact Occentra support with your order number.',
  order_mismatch:'This order does not match the product it was created for. Please contact Occentra support.',
  order_closed:'This order is no longer open for payment. If charged, contact Occentra support.',
  payment_id_conflict:'This payment is already linked to another order. Please contact Occentra support.',
  payment_not_confirmed:'Your payment was found but could not be saved yet. Please try again shortly.'
};
export function describeSnapscanFailure(error: unknown) {
  const failure=asSnapscanError(error);
  const headers: Record<string,string>={'Cache-Control':'no-store'};
  if(failure.retryable) headers['Retry-After']=String(failure.retryAfterSeconds??5);
  return {failure,status:failure.retryable?503:409,headers,body:{error:messages[failure.code],code:failure.code,retryable:failure.retryable},log:{code:failure.code,retryable:failure.retryable,detail:failure.detail??null}};
}
