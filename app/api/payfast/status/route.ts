import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const hash = createHash('sha256').update(token).digest('hex');
  const { data: design, error } = await db.from('guest_designs').select('status,expires_at,purchase_id').eq('token_hash', hash).maybeSingle();
  if (error) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  if (!design || Date.parse(design.expires_at) <= Date.now()) return NextResponse.json({ error: 'Session expired' }, { status: 410 });
  if (!design.purchase_id) return NextResponse.json({ paid: false }, { headers: { 'Cache-Control': 'no-store' } });
  const { data: purchase, error: purchaseError } = await db.from('purchases').select('status').eq('id',design.purchase_id).maybeSingle();
  if (purchaseError) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  return NextResponse.json({ paid: design.status === 'paid' && purchase?.status === 'paid' }, { headers: { 'Cache-Control': 'no-store' } });
}
