import type { SupabaseClient } from '@supabase/supabase-js';
import { isMatchingSnapscanPayment, type SnapscanPayment } from './snapscan';
import { SnapscanError, fromDatabaseError } from './snapscan-errors';

export type ReconcileResult = 'paid' | 'pending' | 'unknown';
export type PaymentLookup = (reference: string) => Promise<unknown[]>;

export function expectedAmount(templateId: string) {
  if (/^cv-[0-5]$/.test(templateId)) return 2000;
  if (/^cover-(classic|navy|sage|executive)$/.test(templateId)) return 1500;
  return null;
}

/**
 * Authenticated lookup of completed SnapScan payments for one merchant reference.
 * Failures are classified so callers (and logs) can tell "SnapScan is busy" from
 * "our API key is wrong" from "no payment yet". An empty list is NOT an error.
 */
export async function fetchSnapscanPayments(reference: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<unknown[]> {
  const url = new URL('https://pos.snapscan.io/merchant/api/v1/payments');
  url.searchParams.set('merchantReference', reference);
  url.searchParams.set('status', 'completed');
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: 'Basic ' + Buffer.from(apiKey + ':').toString('base64'), Accept: 'application/json' },
      cache: 'no-store',
      // Stay under typical serverless limits so the customer gets a clean JSON answer, not a platform 504.
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new SnapscanError('upstream_unavailable', error instanceof Error ? error.name : 'network');
  }
  if (response.status === 429) {
    const wait = Number(response.headers.get('retry-after'));
    throw new SnapscanError('upstream_rate_limited', 'HTTP 429', Number.isFinite(wait) && wait > 0 ? Math.min(wait, 60) : 10);
  }
  if (response.status === 401 || response.status === 403) throw new SnapscanError('upstream_auth', 'HTTP ' + response.status);
  if (response.status >= 500) throw new SnapscanError('upstream_unavailable', 'HTTP ' + response.status);
  if (!response.ok) throw new SnapscanError('upstream_bad_response', 'HTTP ' + response.status);
  let payments: unknown;
  try { payments = await response.json(); } catch { throw new SnapscanError('upstream_bad_response', 'invalid JSON'); }
  if (!Array.isArray(payments)) throw new SnapscanError('upstream_bad_response', 'not an array');
  return payments;
}

/**
 * Both webhook notifications and customer status checks use this one routine.
 * A redirect, a receipt number or a webhook body alone never grants access: the
 * order is only marked paid after SnapScan's authenticated API returns a completed
 * payment with the exact merchant reference and required amount.
 *
 * Ordering matters for reliability: the customer's money is recorded on the purchase
 * as soon as it is verified, even if the saved design has since been removed or its
 * draft window has lapsed. Only the design unlock depends on the design still existing.
 * The unique snapscan_payment_id index stops one transaction paying for two orders,
 * and every write is conditional so concurrent webhook/poll calls are idempotent.
 */
export async function reconcileWith(
  deps: { db: SupabaseClient; lookup: PaymentLookup },
  reference: string,
  notifiedId?: number,
): Promise<ReconcileResult> {
  const { db, lookup } = deps;
  const { data: order, error: orderError } = await db.from('purchases')
    .select('id,merchant_reference,template_id,amount_cents,currency,status,payment_provider,snapscan_payment_id')
    .eq('merchant_reference', reference).maybeSingle();
  if (orderError) throw fromDatabaseError(orderError);
  // A reference that is missing, or belongs to a legacy Payfast order, is not a SnapScan order.
  if (!order || order.payment_provider !== 'snapscan') {
    console.info('SnapScan trace', { event: 'order_not_found', reference });
    return 'unknown';
  }
  if (order.currency !== 'ZAR' || order.amount_cents !== expectedAmount(order.template_id)) {
    throw new SnapscanError('order_mismatch', 'amount or currency');
  }
  if (order.status !== 'pending' && order.status !== 'paid') throw new SnapscanError('order_closed', String(order.status));

  const { data: design, error: designError } = await db.from('guest_designs')
    .select('id,template_id,status,purchase_id').eq('purchase_id', order.id).maybeSingle();
  if (designError) throw fromDatabaseError(designError);
  if (design && design.template_id !== order.template_id) throw new SnapscanError('order_mismatch', 'design template');

  const designUnlockedOrGone = !design || design.status === 'paid';
  if (order.status === 'paid' && designUnlockedOrGone && order.snapscan_payment_id) {
    if (notifiedId !== undefined && order.snapscan_payment_id !== String(notifiedId)) {
      throw new SnapscanError('payment_id_conflict', 'notification for a different payment');
    }
    console.info('SnapScan trace', { event: 'order_already_unlocked', reference, paymentId: order.snapscan_payment_id });
    return 'paid';
  }

  const payments = await lookup(reference);
  const matching = (payments as SnapscanPayment[]).find(payment =>
    payment && typeof payment === 'object' && isMatchingSnapscanPayment(payment, reference, order.amount_cents) &&
    (notifiedId === undefined || payment.id === notifiedId)) || null;
  if (!matching) {
    console.info('SnapScan trace', {
      event: 'payment_lookup_unmatched', reference, count: payments.length,
      checks: (payments as SnapscanPayment[]).slice(0, 3).map(payment => ({
        completed: payment?.status === 'completed',
        reference: payment?.merchantReference === reference,
        required: payment?.requiredAmount === order.amount_cents,
        paidCoversPrice: typeof payment?.totalAmount === 'number' && payment.totalAmount - (payment.tipAmount ?? 0) >= order.amount_cents,
        type: payment?.transactionType === 'payment',
      })),
    });
    return 'pending';
  }
  console.info('SnapScan trace', { event: 'payment_lookup_matched', reference, paymentId: matching.id });

  const paymentId = String(matching.id);
  if (order.status === 'paid' && order.snapscan_payment_id !== paymentId) {
    throw new SnapscanError('payment_id_conflict', 'order already paid by another payment');
  }
  if (order.status === 'pending') {
    const { error: paidError } = await db.from('purchases')
      .update({ status: 'paid', snapscan_payment_id: paymentId })
      .eq('id', order.id).eq('status', 'pending');
    if (paidError) throw fromDatabaseError(paidError);
  }
  // Re-read the exact stored transaction before unlocking: a concurrent request
  // cannot substitute a different payment for this order.
  const { data: confirmedOrder, error: confirmError } = await db.from('purchases')
    .select('status,snapscan_payment_id').eq('id', order.id).maybeSingle();
  if (confirmError) throw fromDatabaseError(confirmError);
  if (confirmedOrder?.status === 'paid' && confirmedOrder.snapscan_payment_id !== paymentId) {
    throw new SnapscanError('payment_id_conflict', 'order paid by another payment');
  }
  if (confirmedOrder?.status !== 'paid') throw new SnapscanError('payment_not_confirmed', 'purchase not paid');

  if (design && design.status === 'draft') {
    // The database guard makes expires_at immutable, so only the status changes here.
    const { error: unlockError } = await db.from('guest_designs')
      .update({ status: 'paid' })
      .eq('id', design.id).eq('purchase_id', order.id).eq('status', 'draft');
    if (unlockError) throw fromDatabaseError(unlockError);
    const { data: confirmedDesign, error: unlockedError } = await db.from('guest_designs')
      .select('status').eq('id', design.id).maybeSingle();
    if (unlockedError) throw fromDatabaseError(unlockedError);
    // A design removed in the meantime is fine: the purchase is already recorded as paid.
    if (confirmedDesign && confirmedDesign.status !== 'paid') throw new SnapscanError('payment_not_confirmed', 'design not unlocked');
  }
  console.info('SnapScan trace', { event: 'design_unlocked', reference, paymentId, templateId: order.template_id, designPresent: Boolean(design) });
  return 'paid';
}
