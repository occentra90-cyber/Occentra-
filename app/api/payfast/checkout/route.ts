import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function encode(value: string) {
  return encodeURIComponent(value.trim()).replace(/~/g, '%7E').replace(/%20/g, '+').replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase()).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body?.designId !== 'string' || !(/^(cv-[0-5]|cover-(classic|navy|sage|executive))$/.test(body.designId)) || !/^[a-f0-9]{64}$/.test(body?.token || '')) {
      return NextResponse.json({ error: 'Invalid CV template' }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) return NextResponse.json({ error: 'Checkout is not configured' }, { status: 503 });
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const tokenHash = createHash('sha256').update(body.token).digest('hex');
    const { data: design, error: designError } = await db.from('guest_designs')
      .select('id,template_id,status,expires_at').eq('token_hash', tokenHash).maybeSingle();
    if (designError || !design || design.template_id !== body.designId || design.status !== 'draft' || Date.parse(design.expires_at) <= Date.now()) {
      return NextResponse.json({ error: 'Save an editable CV before checkout' }, { status: 400 });
    }
    const cover = body.designId.startsWith('cover-');
    const amountCents = cover ? 1500 : 2000;
    const amount = cover ? '15.00' : '20.00';
    const itemName = (cover ? 'Occentra Cover Letter ' : 'Occentra CV Template ') + body.designId;
    const merchantReference = randomUUID();
    const { data: order, error: orderError } = await db.from('purchases').insert({
      merchant_reference: merchantReference, template_id: design.template_id, amount_cents: amountCents, currency: 'ZAR', status: 'pending'
    }).select('id').single();
    if (orderError || !order) return NextResponse.json({ error: 'Could not create order' }, { status: 503 });
    const { error: linkError } = await db.from('guest_designs').update({ purchase_id: order.id }).eq('id', design.id);
    if (linkError) return NextResponse.json({ error: 'Could not prepare checkout' }, { status: 503 });
    // Live Payfast: amounts are server-defined; never trust browser-provided prices.
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    // The optional passphrase must match the live Payfast account if one is configured.
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    // Always use the public production hostname: Payfast ITN must never target a transient deployment URL.
    const baseUrl = 'https://occentra-occentra.vercel.app';
    if (!merchantId || !merchantKey) return NextResponse.json({ error: 'Live Payfast is not configured' }, { status: 503 });
    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: baseUrl + (cover ? '/cover-letters?template=' + body.designId.replace('cover-', '') + '&design=' + body.token + '&payment=returned' : '/?design=' + body.token + '&payment=returned'),
      cancel_url: baseUrl + (cover ? '/cover-letters?template=' + body.designId.replace('cover-', '') + '&design=' + body.token + '&payment=cancelled' : '/?design=' + body.token + '&payment=cancelled'),
      notify_url: baseUrl + '/api/payfast/notify',
      // An ITN endpoint is required before real payment/download unlocking is enabled.
      m_payment_id: merchantReference,
      amount,
      item_name: itemName,
    };
    const paramString = Object.entries(fields).filter(([, value]) => value !== '').map(([key, value]) => key + '=' + encode(value)).join('&');
    const signatureInput = paramString + (passphrase ? '&passphrase=' + encode(passphrase) : '');
    const signature = createHash('md5').update(signatureInput).digest('hex');
    return NextResponse.json({ url: 'https://www.payfast.co.za/eng/process', fields: { ...fields, signature } });
  } catch {
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 400 });
  }
}
