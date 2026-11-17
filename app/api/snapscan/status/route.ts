import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { snapscanVerificationConfigured } from '../../../../lib/snapscan';
import { reconcileSnapscanPayment } from '../../../../lib/snapscan-reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return reply({ error: 'Invalid private design link' }, 400);
  // Existing paid orders can still be verified after new checkouts are turned off.
  if (!snapscanVerificationConfigured()) return reply({ error: 'Payment verification is not configured' }, 503);
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const hash = createHash('sha256').update(token).digest('hex');
    const { data: design, error: designError } = await db.from('guest_designs')
      .select('id,template_id,status,expires_at,purchase_id').eq('token_hash', hash).maybeSingle();
    if (designError) throw designError;
    if (!design || Date.parse(design.expires_at) <= Date.now()) return reply({ error: 'Private link expired' }, 410);
    if (!design.purchase_id) return reply({ paid: false });
    const { data: order, error: orderError } = await db.from('purchases')
      .select('merchant_reference,template_id,payment_provider,status,snapscan_payment_id')
      .eq('id', design.purchase_id).maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.template_id !== design.template_id || order.payment_provider !== 'snapscan') {
      return reply({ error: 'Purchase mismatch' }, 409);
    }
    if (order.status === 'paid' && design.status === 'paid' && order.snapscan_payment_id) return reply({ paid: true });
    const status = await reconcileSnapscanPayment(order.merchant_reference);
    return reply({ paid: status === 'paid' });
  } catch {
    return reply({ error: 'Payment verification is temporarily unavailable' }, 503);
  }
}
