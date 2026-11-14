import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
const encode = (v: string) => encodeURIComponent(v.trim()).replace(/~/g,'%7E').replace(/%20/g,'+').replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
export async function POST(req: Request) {
  try {
    console.info('payfast_itn_received', { method: 'POST' });
    const body = await req.text();
    if (body.length > 20000) { console.warn('payfast_itn_rejected', { reason: 'payload_too_large' }); return new NextResponse('Too large',{status:413}); }
    const data = new URLSearchParams(body);
    const signature = data.get('signature') || '';
    if (data.get('merchant_id') !== '10000100' || !/^[a-f0-9]{32}$/.test(signature)) { console.warn('payfast_itn_rejected', { reason: 'merchant_or_signature_format' }); return new NextResponse('Invalid notification',{status:400}); }
    // Payfast ITN includes empty fields in the signed string, in posted order, stopping at signature.
    // Unlike checkout generation, ITN validation must not trim received field values.
    const fields: string[] = [];
    for (const [key, value] of data.entries()) {
      if (key === 'signature') break;
      fields.push(key + '=' + encodeURIComponent(value).replace(/%20/g, '+').replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()));
    }
    const params = fields.join('&');
    const expected = createHash('md5').update(params+'&passphrase='+encode('jt7NOE43FZPn')).digest('hex');
    if (!timingSafeEqual(Buffer.from(expected),Buffer.from(signature))) { console.warn('payfast_itn_rejected', { reason: 'signature_mismatch' }); return new NextResponse('Invalid signature',{status:400}); }
    if (data.get('payment_status') !== 'COMPLETE') { console.warn('payfast_itn_rejected', { reason: 'payment_not_complete' }); return new NextResponse('Payment not complete',{status:400}); }
    if (!/^Occentra CV Template cv-[0-5]$/.test(data.get('item_name')||'') || Number(data.get('amount_gross')) !== 20 || !/^[a-f0-9-]{36}$/i.test(data.get('m_payment_id')||'')) { console.warn('payfast_itn_rejected', { reason: 'order_details' }); return new NextResponse('Invalid order',{status:400}); }
    const validation = await fetch('https://sandbox.payfast.co.za/eng/query/validate',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params,cache:'no-store',signal:AbortSignal.timeout(10000)});
    if (!validation.ok || (await validation.text()).trim()!=='VALID') { console.warn('payfast_itn_rejected', { reason: 'remote_validation', status: validation.status }); return new NextResponse('Invalid payment',{status:400}); }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) return new NextResponse('Database not configured', { status: 503 });
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const reference = data.get('m_payment_id')!;
    const { data: order, error: orderError } = await db.from('purchases')
      .select('id,merchant_reference,template_id,amount_cents,currency,status,payfast_payment_id')
      .eq('merchant_reference', reference).maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.template_id !== data.get('item_name')!.replace('Occentra CV Template ', '') ||
      order.amount_cents !== 2000 || order.currency !== 'ZAR') {
      return new NextResponse('Order mismatch', { status: 400 });
    }
    const paymentId = data.get('pf_payment_id');
    if (!paymentId) return new NextResponse('Missing payment ID', { status: 400 });
    if (order.status === 'paid') {
      return new NextResponse(order.payfast_payment_id === paymentId ? 'Already verified' : 'Payment ID mismatch',
        { status: order.payfast_payment_id === paymentId ? 200 : 409 });
    }
    if (order.status !== 'pending') return new NextResponse('Order not pending', { status: 409 });
    const { data: guest, error: guestError } = await db.from('guest_designs')
      .select('id,status,expires_at').eq('purchase_id', order.id).maybeSingle();
    if (guestError) throw guestError;
    if (!guest || guest.status !== 'draft' || Date.parse(guest.expires_at) <= Date.now()) {
      return new NextResponse('Saved design unavailable', { status: 409 });
    }
    // A verified notification alone may update payment state. Never trust browser redirects.
    const { error: paidError } = await db.from('purchases')
      .update({ status: 'paid', payfast_payment_id: paymentId })
      .eq('id', order.id).eq('status', 'pending');
    if (paidError) throw paidError;
    const { error: lockError } = await db.from('guest_designs')
      .update({ status: 'paid' }).eq('id', guest.id).eq('status', 'draft');
    if (lockError) throw lockError;
    console.info('payfast_itn_verified', { paymentStatus: data.get('payment_status') === 'COMPLETE' ? 'COMPLETE' : 'OTHER' });
    return new NextResponse('Notification verified',{status:200});
  } catch (error) {
    console.error('payfast_itn_error', { kind: error instanceof Error ? error.name : 'unknown' });
    return new NextResponse('Notification validation unavailable',{status:503});
  }
}
export async function GET() { return new NextResponse('Payfast ITN endpoint',{status:200}); }
