import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
export const runtime = 'nodejs';
const encode = (v: string) => encodeURIComponent(v.trim()).replace(/~/g,'%7E').replace(/%20/g,'+').replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
export async function POST(req: Request) {
  try {
    const body = await req.text();
    if (body.length > 20000) return new NextResponse('Too large',{status:413});
    const data = new URLSearchParams(body);
    const signature = data.get('signature') || '';
    if (data.get('merchant_id') !== '10000100' || !/^[a-f0-9]{32}$/.test(signature)) return new NextResponse('Invalid notification',{status:400});
    const params = Array.from(data.entries()).filter(([k,v])=>k!=='signature'&&v!=='').map(([k,v])=>k+'='+encode(v)).join('&');
    const expected = createHash('md5').update(params+'&passphrase='+encode('jt7NOE43FZPn')).digest('hex');
    if (!timingSafeEqual(Buffer.from(expected),Buffer.from(signature))) return new NextResponse('Invalid signature',{status:400});
    if (!/^Occentra CV Template cv-[0-5]$/.test(data.get('item_name')||'') || Number(data.get('amount_gross')) !== 20 || !/^[a-f0-9-]{36}$/i.test(data.get('m_payment_id')||'')) return new NextResponse('Invalid order',{status:400});
    const validation = await fetch('https://sandbox.payfast.co.za/eng/query/validate',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params,cache:'no-store',signal:AbortSignal.timeout(10000)});
    if (!validation.ok || (await validation.text()).trim()!=='VALID') return new NextResponse('Invalid payment',{status:400});
    // No durable order database yet: do not unlock a CV from this notification.
    return new NextResponse('Notification verified',{status:200});
  } catch {
    return new NextResponse('Notification validation unavailable',{status:503});
  }
}
export async function GET() { return new NextResponse('Payfast ITN endpoint',{status:200}); }
