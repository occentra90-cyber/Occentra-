import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isMatchingSnapscanPayment, snapscanConfigured, type SnapscanPayment } from '../../../../lib/snapscan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return reply({ error: 'Invalid private design link' }, 400);
  if (!snapscanConfigured()) return reply({ error: 'Payment verification is not configured' }, 503);
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const hash = createHash('sha256').update(token).digest('hex');
    const { data: design, error: designError } = await db.from('guest_designs')
      .select('id,template_id,status,expires_at,purchase_id').eq('token_hash', hash).maybeSingle();
    if (designError) return reply({ error: 'Could not check purchase' }, 503);
    if (!design || Date.parse(design.expires_at) <= Date.now()) return reply({ error: 'Private link expired' }, 410);
    if (!design.purchase_id) return reply({ paid: false });
    const { data: purchase, error: purchaseError } = await db.from('purchases')
      .select('id,template_id,status,merchant_reference,amount_cents,currency,payment_provider,snapscan_payment_id')
      .eq('id', design.purchase_id).maybeSingle();
    if (purchaseError) return reply({ error: 'Could not check purchase' }, 503);
    if (!purchase || purchase.payment_provider !== 'snapscan' || purchase.template_id !== design.template_id ||
        purchase.currency !== 'ZAR') return reply({ error: 'Purchase mismatch' }, 409);
    if (purchase.status === 'paid' && design.status === 'paid' && purchase.snapscan_payment_id) return reply({ paid: true });
    if (purchase.status !== 'pending' && purchase.status !== 'paid') return reply({ paid: false });

    // Only SnapScan's authenticated API can confirm a payment. A redirect alone never unlocks a product.
    const url = new URL('https://pos.snapscan.io/merchant/api/v1/payments');
    url.searchParams.set('merchantReference', purchase.merchant_reference);
    url.searchParams.set('status', 'completed');
    const response = await fetch(url, {
      headers: { Authorization: 'Basic ' + Buffer.from(process.env.SNAPSCAN_API_KEY! + ':').toString('base64') },
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return reply({ error: 'Verification unavailable; please check again later' }, 503);
    const payments: unknown = await response.json();
    if (!Array.isArray(payments)) return reply({ error: 'Unexpected verification response' }, 503);
    const match = (payments as SnapscanPayment[]).find(p => p && isMatchingSnapscanPayment(p, purchase.merchant_reference, purchase.amount_cents));
    if (!match) return reply({ paid: false });
    const paymentId = String(match.id);
    if (purchase.status === 'paid' && purchase.snapscan_payment_id !== paymentId) return reply({ error: 'Payment mismatch' }, 409);
    if (purchase.status === 'pending') {
      // Unique snapscan_payment_id prevents a single transaction paying for more than one order.
      const { error: paidError } = await db.from('purchases')
        .update({ status: 'paid', snapscan_payment_id: paymentId })
        .eq('id', purchase.id).eq('status', 'pending');
      if (paidError) return reply({ error: 'Unable to record verification' }, 503);
    }
    // Re-read after the conditional write: a concurrent cancellation/verification
    // must never allow us to unlock a design for a different or unpaid order.
    const { data: verifiedOrder, error: verifiedError } = await db.from('purchases')
      .select('status,snapscan_payment_id').eq('id', purchase.id).maybeSingle();
    if (verifiedError || verifiedOrder?.status !== 'paid' || verifiedOrder.snapscan_payment_id !== paymentId) {
      return reply({ error: 'Order confirmation incomplete' }, 503);
    }
    const { error: unlockError } = await db.from('guest_designs').update({ status: 'paid' })
      .eq('id', design.id).eq('status', 'draft');
    if (unlockError) return reply({ error: 'Unable to unlock purchase' }, 503);
    const { data: confirmed, error: confirmError } = await db.from('guest_designs')
      .select('status').eq('id', design.id).maybeSingle();
    if (confirmError || confirmed?.status !== 'paid') return reply({ error: 'Verification incomplete' }, 503);
    return reply({ paid: true });
  } catch {
    return reply({ error: 'Payment verification is temporarily unavailable' }, 503);
  }
}
