import { SnapscanError, fromDatabaseError } from './snapscan-errors';
import { createClient } from '@supabase/supabase-js';
import { isMatchingSnapscanPayment, type SnapscanPayment } from './snapscan';

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SnapscanError('not_configured','supabase');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function expectedAmount(templateId: string) {
  if (/^cv-[0-5]$/.test(templateId)) return 2000;
  if (/^cover-(classic|navy|sage|executive)$/.test(templateId)) return 1500;
  return null;
}

async function getVerifiedPayment(reference: string, amountCents: number, notifiedId?: number) {
  const key = process.env.SNAPSCAN_API_KEY;
  if (!key) throw new SnapscanError('not_configured','snapscan api key');
  const url = new URL('https://pos.snapscan.io/merchant/api/v1/payments');
  url.searchParams.set('merchantReference', reference);
  url.searchParams.set('status', 'completed');
  let response: Response;
  try { response = await fetch(url, {
    headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') },
    cache: 'no-store', signal: AbortSignal.timeout(8000),
  }); } catch (error) { throw new SnapscanError('upstream_unavailable', error instanceof Error ? error.name : 'network'); }
  if (response.status === 401 || response.status === 403) throw new SnapscanError('upstream_auth', 'HTTP '+response.status);
  if (response.status === 429) throw new SnapscanError('upstream_rate_limited', 'HTTP 429', 10);
  if (!response.ok) throw new SnapscanError(response.status >= 500 ? 'upstream_unavailable' : 'upstream_bad_response', 'HTTP '+response.status);
  let payments: unknown;
  try { payments = await response.json(); } catch { throw new SnapscanError('upstream_bad_response','invalid JSON'); }
  if (!Array.isArray(payments)) throw new SnapscanError('upstream_bad_response','not an array');
  const matching = (payments as SnapscanPayment[]).find(payment =>
    payment && isMatchingSnapscanPayment(payment, reference, amountCents) &&
    (notifiedId === undefined || payment.id === notifiedId)) || null;
  if (!matching) {
    console.info('SnapScan trace', {
      event: 'payment_lookup_unmatched', reference,
      count: payments.length,
      checks: (payments as SnapscanPayment[]).slice(0, 3).map(payment => ({
        completed: payment.status === 'completed',
        reference: payment.merchantReference === reference,
        amount: typeof payment.totalAmount === 'number' && payment.totalAmount - (payment.tipAmount ?? 0) >= amountCents,
        required: payment.requiredAmount === amountCents,
        type: payment.transactionType === 'payment',
      })),
    });
  } else {
    console.info('SnapScan trace', { event: 'payment_lookup_matched', reference, paymentId: matching.id });
  }
  return matching;
}

/**
 * Both webhook notifications and customer status checks use the same authenticated
 * payment reconciliation. A redirect or webhook body alone never grants access.
 * The unique transaction ID constraint in the database prevents double redemption.
 */
export async function reconcileSnapscanPayment(reference: string, notifiedId?: number): Promise<'paid' | 'pending' | 'unknown'> {
  const db = database();
  const { data: order, error: orderError } = await db.from('purchases')
    .select('id,merchant_reference,template_id,amount_cents,currency,status,payment_provider,snapscan_payment_id')
    .eq('merchant_reference', reference).maybeSingle();
  if (orderError) throw fromDatabaseError(orderError);
  if (!order || order.payment_provider !== 'snapscan') {
    console.info('SnapScan trace', { event: 'order_not_found', reference });
    return 'unknown';
  }
  if (order.payment_provider !== 'snapscan' || order.currency !== 'ZAR' ||
      order.amount_cents !== expectedAmount(order.template_id)) throw new SnapscanError('order_mismatch','order');
  if (order.status !== 'pending' && order.status !== 'paid') throw new SnapscanError('order_closed',String(order.status));

  const { data: design, error: designError } = await db.from('guest_designs')
    .select('id,template_id,status,expires_at,purchase_id').eq('purchase_id', order.id).maybeSingle();
  if (designError) throw fromDatabaseError(designError);
  if (design && design.template_id !== order.template_id) {
    throw new Error('Payment order mismatch');
  }
  if (order.status === 'paid' && (!design || design.status === 'paid') && order.snapscan_payment_id) {
    if (notifiedId !== undefined && order.snapscan_payment_id !== String(notifiedId)) throw new SnapscanError('payment_id_conflict','different payment');
    console.info('SnapScan trace', { event: 'order_already_unlocked', reference, paymentId: order.snapscan_payment_id });
    return 'paid';
  }

  const payment = await getVerifiedPayment(reference, order.amount_cents, notifiedId);
  if (!payment) return 'pending';
  const paymentId = String(payment.id);
  if (order.status === 'paid' && order.snapscan_payment_id !== paymentId) throw new Error('Payment identifier mismatch');

  if (order.status === 'pending') {
    const { error: paidError } = await db.from('purchases')
      .update({ status: 'paid', snapscan_payment_id: paymentId })
      .eq('id', order.id).eq('status', 'pending');
    if (paidError) throw fromDatabaseError(paidError);
  }
  // Recheck the exact stored transaction before unlocking. Concurrent requests
  // cannot substitute a different order or reuse a SnapScan transaction ID.
  const { data: confirmedOrder, error: confirmError } = await db.from('purchases')
    .select('status,snapscan_payment_id').eq('id', order.id).maybeSingle();
  if (confirmError) throw fromDatabaseError(confirmError);
  if (confirmedOrder?.status !== 'paid' || confirmedOrder.snapscan_payment_id !== paymentId) {
    throw new SnapscanError('payment_not_confirmed','purchase');
  }

  if (design?.status === 'draft') {
    const { error: unlockError } = await db.from('guest_designs')
      // The database guard makes expires_at immutable. Its initial value
      // already grants 30 days, so only update payment status here.
      .update({ status: 'paid' })
      .eq('id', design.id).eq('purchase_id', order.id).eq('status', 'draft');
    if (unlockError) throw fromDatabaseError(unlockError);
  }
  if (design) {
    const { data: confirmedDesign, error: unlockedError } = await db.from('guest_designs')
      .select('status').eq('id', design.id).maybeSingle();
    if (unlockedError) throw unlockedError;
    if (confirmedDesign && confirmedDesign.status !== 'paid') throw new SnapscanError('payment_not_confirmed','design');
  }
  console.info('SnapScan trace', { event: 'design_unlocked', reference, paymentId, templateId: order.template_id });
  return 'paid';
}
