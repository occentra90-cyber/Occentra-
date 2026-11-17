import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createSnapscanPaymentUrl, snapscanConfigured } from '../../../../lib/snapscan';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!snapscanConfigured()) return NextResponse.json({ error: 'SnapScan verification is not configured yet' }, { status: 503 });
  try {
    const body = await request.json();
    if (typeof body?.designId !== 'string' || !/^(cv-[0-5]|cover-(classic|navy|sage|executive))$/.test(body.designId) ||
        typeof body?.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token) ||
        (body.returnOrigin !== undefined && typeof body.returnOrigin !== 'string')) {
      return NextResponse.json({ error: 'Invalid saved design' }, { status: 400 });
    }
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const tokenHash = createHash('sha256').update(body.token).digest('hex');
    const { data: design, error: designError } = await db.from('guest_designs')
      .select('id,template_id,status,expires_at,purchase_id').eq('token_hash', tokenHash).maybeSingle();
    if (designError || !design || design.template_id !== body.designId || design.status !== 'draft' ||
        design.purchase_id || Date.parse(design.expires_at) <= Date.now()) {
      return NextResponse.json({ error: 'Save a new design before checkout' }, { status: 409 });
    }
    const amountCents = body.designId.startsWith('cover-') ? 1500 : 2000;
    const reference = randomUUID();
    // Validate the merchant URL before creating an order. Do not accept an amount or redirect from the browser.
    // The returned browser might not share storage with the checkout tab.
    // Carry the random merchant order reference (already sent to SnapScan) so
    // the cover-letter page can reconcile paid orders automatically on return.
    const returnPath = body.designId.startsWith('cover-')
      ? '/cover-letters?o=' + reference : '/';
    const paymentUrl = createSnapscanPaymentUrl(reference, amountCents, returnPath, body.returnOrigin);
    const { data: purchase, error: purchaseError } = await db.from('purchases').insert({
      merchant_reference: reference, template_id: design.template_id, amount_cents: amountCents,
      currency: 'ZAR', status: 'pending', payment_provider: 'snapscan',
    }).select('id').single();
    if (purchaseError || !purchase) return NextResponse.json({ error: 'Could not create order' }, { status: 503 });
    const { data: linked, error: linkError } = await db.from('guest_designs')
      .update({ purchase_id: purchase.id }).eq('id', design.id).is('purchase_id', null).eq('status', 'draft').select('id').maybeSingle();
    if (linkError || !linked) return NextResponse.json({ error: 'Could not link saved design' }, { status: 409 });
    // Send the same random reference back to the initiating browser so it can
    // resume this exact order even when the SnapScan app does not redirect.
    console.info('SnapScan checkout created', { orderSuffix: reference.slice(-6), templateId: design.template_id });
    return NextResponse.json({ url: paymentUrl, reference }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'SnapScan checkout is unavailable' }, { status: 503 });
  }
}
