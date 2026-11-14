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
    console.info('payfast_itn_shape', { contentType: req.headers.get('content-type')?.split(';')[0] || 'missing', fieldCount: [...data.keys()].length, fieldNames: [...data.keys()].slice(0,35), hasMerchantId: data.has('merchant_id'), hasSignature: data.has('signature'), signatureLength: signature.length, signatureHex: /^[a-f0-9]{32}$/i.test(signature), merchantIdLength: (data.get('merchant_id') || '').length, merchantIdMatches: data.get('merchant_id') === process.env.PAYFAST_MERCHANT_ID });
    if (!process.env.PAYFAST_MERCHANT_ID || data.get('merchant_id') !== process.env.PAYFAST_MERCHANT_ID || !/^[a-f0-9]{32}$/i.test(signature)) { console.warn('payfast_itn_rejected', { reason: 'merchant_or_signature_format', merchantConfigured: Boolean(process.env.PAYFAST_MERCHANT_ID), merchantMatches: data.get('merchant_id') === process.env.PAYFAST_MERCHANT_ID, signatureLengthValid: signature.length === 32, signatureHexValid: /^[a-f0-9]{32}$/i.test(signature) }); return new NextResponse('Invalid notification',{status:400}); }
    // Payfast ITN includes empty fields in the signed string, in posted order, stopping at signature.
    // Unlike checkout generation, ITN validation must not trim received field values.
    const fields: string[] = [];
    for (const [key, value] of data.entries()) {
      if (key === 'signature') break;
      fields.push(key + '=' + encodeURIComponent(value).replace(/%20/g, '+').replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()));
    }
    const params = fields.join('&');
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    const expected = createHash('md5').update(params + (passphrase ? '&passphrase=' + encode(passphrase) : '')).digest('hex');
    if (!timingSafeEqual(Buffer.from(expected),Buffer.from(signature.toLowerCase()))) { console.warn('payfast_itn_rejected', { reason: 'signature_mismatch' }); return new NextResponse('Invalid signature',{status:400}); }
    if (data.get('payment_status') !== 'COMPLETE') { console.warn('payfast_itn_rejected', { reason: 'payment_not_complete' }); return new NextResponse('Payment not complete',{status:400}); }
    const itemName = data.get('item_name') || '';
    const cover = /^Occentra Cover Letter cover-(classic|navy|sage|executive)$/.test(itemName);
    const cv = /^Occentra CV Template cv-[0-5]$/.test(itemName);
    const expectedCents = cover ? 1500 : 2000;
    const templateId = itemName.replace(cover ? 'Occentra Cover Letter ' : 'Occentra CV Template ', '');
    if (!(cover || cv) || Math.round(Number(data.get('amount_gross')) * 100) !== expectedCents || !/^[a-f0-9-]{36}$/i.test(data.get('m_payment_id')||'')) { console.warn('payfast_itn_rejected', { reason: 'order_details' }); return new NextResponse('Invalid order',{status:400}); }
    const validation = await fetch('https://www.payfast.co.za/eng/query/validate',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params,cache:'no-store',signal:AbortSignal.timeout(10000)});
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
    if (!order || order.template_id !== templateId ||
      order.amount_cents !== expectedCents || order.currency !== 'ZAR') {
      return new NextResponse('Order mismatch', { status: 400 });
    }
    const paymentId = data.get('pf_payment_id');
    if (!paymentId) return new NextResponse('Missing payment ID', { status: 400 });
    if (order.status === 'paid' && order.payfast_payment_id !== paymentId) return new NextResponse('Payment ID mismatch', { status: 409 });
    if (order.status !== 'pending' && order.status !== 'paid') return new NextResponse('Order not pending', { status: 409 });
    const { data: guest, error: guestError } = await db.from('guest_designs')
      .select('id,status,expires_at').eq('purchase_id', order.id).maybeSingle();
    if (guestError) throw guestError;
    if (!guest || Date.parse(guest.expires_at) <= Date.now()) {
      return new NextResponse('Saved design unavailable', { status: 409 });
    }
    // Lock the design first. A retry can finish recording payment if the second write fails.
    if (guest.status === 'draft') {
      const { error: lockError } = await db.from('guest_designs')
        .update({ status: 'paid' }).eq('id', guest.id).eq('status', 'draft');
      if (lockError) throw lockError;
    } else if (guest.status !== 'paid') {
      return new NextResponse('Invalid design state', { status: 409 });
    }
    if (order.status === 'pending') {
      const { error: paidError } = await db.from('purchases')
        .update({ status: 'paid', payfast_payment_id: paymentId })
        .eq('id', order.id).eq('status', 'pending');
      if (paidError) throw paidError;
    }
    console.info('payfast_itn_verified', { paymentStatus: data.get('payment_status') === 'COMPLETE' ? 'COMPLETE' : 'OTHER' });
    return new NextResponse('Notification verified',{status:200});
  } catch (error) {
    console.error('payfast_itn_error', { kind: error instanceof Error ? error.name : 'unknown' });
    return new NextResponse('Notification validation unavailable',{status:503});
  }
}
export async function GET() { return new NextResponse('Payfast ITN endpoint',{status:200}); }
