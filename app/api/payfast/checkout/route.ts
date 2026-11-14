import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

function encode(value: string) {
  return encodeURIComponent(value.trim()).replace(/~/g, '%7E').replace(/%20/g, '+').replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase()).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body?.designId !== 'string' || !/^cv-[0-5]$/.test(body.designId)) {
      return NextResponse.json({ error: 'Invalid CV template' }, { status: 400 });
    }
    // Sandbox only: do not use live credentials or accept an amount from the browser.
    const merchantId = '10000100';
    const merchantKey = '46f0cd694581a';
    // Public Payfast sandbox credentials, not the merchant's live account.
    const passphrase = 'jt7NOE43FZPn';
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://occentra.vercel.app').replace(/\/$/, '');
    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: baseUrl + '/?payment=returned',
      cancel_url: baseUrl + '/?payment=cancelled',
      // An ITN endpoint is required before real payment/download unlocking is enabled.
      m_payment_id: randomUUID(),
      amount: '20.00',
      item_name: 'Occentra CV Template ' + body.designId,
    };
    const paramString = Object.entries(fields).filter(([, value]) => value !== '').map(([key, value]) => key + '=' + encode(value)).join('&');
    const signatureInput = paramString + (passphrase ? '&passphrase=' + encode(passphrase) : '');
    const signature = createHash('md5').update(signatureInput).digest('hex');
    return NextResponse.json({ url: 'https://sandbox.payfast.co.za/eng/process', fields: { ...fields, signature } });
  } catch {
    return NextResponse.json({ error: 'Could not start sandbox checkout' }, { status: 400 });
  }
}
