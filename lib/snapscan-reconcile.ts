import { createClient } from '@supabase/supabase-js';
import { isMatchingSnapscanPayment, type SnapscanPayment } from './snapscan';

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Payment database is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function expectedAmount(templateId: string) {
  if (/^cv-[0-5]$/.test(templateId)) return 2000;
  if (/^cover-(classic|navy|sage|executive)$/.test(templateId)) return 1500;
  return null;
}

async function getVerifiedPayment(reference: string, amountCents: number, notifiedId?: number) {
  const key = process.env.SNAPSCAN_API_KEY;
  if (!key) throw new Error('SnapScan verification is not configured');
  const url = new URL('https://pos.snapscan.io/merchant/api/v1/payments');
  url.searchParams.set('merchantReference', reference);
  url.searchParams.set('status', 'completed');
  const response = await fetch(url, {
    headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') },
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('SnapScan payment lookup returned HTTP ' + response.status);
  const payments: unknown = await response.json();
  if (!Array.isArray(payments)) throw new Error('Invalid SnapScan payment response');
  const matching = (payments as SnapscanPayment[]).find(payment =>
    payment && isMatchingSnapscanPayment(payment, reference, amountCents) &&
    (notifiedId === undefined || payment.id === notifiedId)) || null;
  if (!matching) {
    console.info('SnapScan completed-payment lookup did not match', {
      orderSuffix: reference.slice(-6),
      count: payments.length,
      checks: (payments as SnapscanPayment[]).slice(0, 3).map(payment => ({
        completed: payment.status === 'completed',
        reference: payment.merchantReference === reference,
        amount: payment.totalAmount === amountCents,
        required: payment.requiredAmount === amountCents,
        type: payment.transactionType === 'payment',
      })),
    });
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
  if (orderError) throw orderError;
  if (!order) return 'unknown';
  if (order.payment_provider !== 'snapscan' || order.currency !== 'ZAR' ||
      order.amount_cents !== expectedAmount(order.template_id)) throw new Error('Payment order mismatch');
  if (order.status !== 'pending' && order.status !== 'paid') return 'pending';

  const { data: design, error: designError } = await db.from('guest_designs')
    .select('id,template_id,status,expires_at,purchase_id').eq('purchase_id', order.id).maybeSingle();
  if (designError) throw designError;
  if (!design || design.template_id !== order.template_id ||
      (design.status !== 'paid' && Date.parse(design.expires_at) <= Date.now())) {
    throw new Error('Paid design is unavailable');
  }
  if (order.status === 'paid' && design.status === 'paid' && order.snapscan_payment_id) {
    if (notifiedId !== undefined && order.snapscan_payment_id !== String(notifiedId)) throw new Error('Payment identifier mismatch');
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
    if (paidError) throw paidError;
  }
  // Recheck the exact stored transaction before unlocking. Concurrent requests
  // cannot substitute a different order or reuse a SnapScan transaction ID.
  const { data: confirmedOrder, error: confirmError } = await db.from('purchases')
    .select('status,snapscan_payment_id').eq('id', order.id).maybeSingle();
  if (confirmError || confirmedOrder?.status !== 'paid' || confirmedOrder.snapscan_payment_id !== paymentId) {
    throw new Error('Payment record was not confirmed');
  }

  if (design.status === 'draft') {
    const { error: unlockError } = await db.from('guest_designs')
      .update({ status: 'paid', expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', design.id).eq('purchase_id', order.id).eq('status', 'draft');
    if (unlockError) throw unlockError;
  }
  const { data: confirmedDesign, error: unlockedError } = await db.from('guest_designs')
    .select('status').eq('id', design.id).maybeSingle();
  if (unlockedError || confirmedDesign?.status !== 'paid') throw new Error('Paid design was not unlocked');
  return 'paid';
}
