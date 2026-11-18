import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { designs } from '../../../../lib/catalog';

export const runtime = 'nodejs';
const tokenPattern = /^[a-f0-9]{64}$/;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error('Guest saving is not configured');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function purgeExpired() {
  // A completed purchase must not be erased when the two-hour draft
  // checkout window expires. Paid designs need to remain downloadable.
  const { error } = await db().from('guest_designs').delete()
    .eq('status', 'draft').is('purchase_id', null).lt('expires_at', new Date().toISOString());
  if (error) console.error('guest_cleanup_failed', error.code);
}
function fail(error: string, status: number) { return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } }); }
function validFields(x: unknown): x is Record<string, string | string[]> {
  return !!x && typeof x === 'object' && !Array.isArray(x) &&
    Object.keys(x).length <= 40 &&
    Object.entries(x).every(([k, v]) => k.length <= 50 && ((typeof v === 'string' && v.length <= 5000) || (k === 'paragraphs' && Array.isArray(v) && v.length <= 15 && v.every(p => typeof p === 'string' && p.length <= 5000))));
}
function validSettings(x: unknown): x is Record<string, boolean> {
  return !!x && typeof x === 'object' && !Array.isArray(x) &&
    Object.keys(x).length <= 10 &&
    Object.entries(x).every(([k, v]) => k.length <= 50 && typeof v === 'boolean');
}
async function lookup(token: string) {
  return db().from('guest_designs').select('id,template_id,category,title,fields,settings,status,created_at,expires_at,purchase_id')
    .eq('token_hash', hash(token)).maybeSingle();
}
export async function POST(request: Request) {
  try {
    await purgeExpired();
    const body = await request.json();
    const cover = typeof body?.templateId === 'string' && /^cover-(classic|navy|sage|executive)$/.test(body.templateId);
    const design = cover ? { id: body.templateId, category: 'cover', name: 'Cover Letter' } : designs.find(d => d.id === body?.templateId);
    if (!design || !validFields(body?.fields) || !validSettings(body?.settings)) return fail('Invalid design', 400);
    const token = randomBytes(32).toString('hex');
    const { data, error } = await db().from('guest_designs').insert({
      token_hash: hash(token), template_id: design.id, category: design.category,
      title: String(body.fields.name || design.name).slice(0, 120),
      fields: body.fields, settings: body.settings,
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }).select('expires_at').single();
    if (error) throw error;
    return NextResponse.json({ token, expiresAt: data.expires_at }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('Saving is currently unavailable', 503); }
}
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!tokenPattern.test(token)) return fail('Invalid private link', 400);
  const order = new URL(request.url).searchParams.get('order');
  if (order !== null && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(order)) return fail('Invalid order', 400);
  try {
    await purgeExpired();
    const { data, error } = await lookup(token);
    if (error) throw error;
    if (!data || (data.status !== 'paid' && Date.parse(data.expires_at) <= Date.now())) return fail('This link has expired or is unavailable', 404);
    // After a payment the browser asks for its saved design together with the order it is returning
    // for. The design must be linked to that exact order, so a stale token from an earlier attempt
    // can never open the wrong purchase.
    if (order) {
      const { data: purchase, error: purchaseError } = data.purchase_id
        ? await db().from('purchases').select('merchant_reference').eq('id', data.purchase_id).maybeSingle()
        : { data: null, error: null };
      if (purchaseError) throw purchaseError;
      if (!purchase || purchase.merchant_reference !== order) return fail('This saved design belongs to a different order', 409);
    }
    const { purchase_id: _internal, ...design } = data;
    return NextResponse.json({ design }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('Unable to load design', 503); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!tokenPattern.test(body?.token || '') || !validFields(body?.fields) || !validSettings(body?.settings)) return fail('Invalid request', 400);
    const { data: existing, error: readError } = await lookup(body.token);
    if (readError) throw readError;
    if (!existing || Date.parse(existing.expires_at) <= Date.now()) return fail('This link has expired', 410);
    if (existing.status !== 'draft') return fail('Paid designs cannot be edited', 403);
    const { data, error } = await db().from('guest_designs')
      .update({ fields: body.fields, settings: body.settings, title: String(body.fields.name || existing.title).slice(0, 120) })
      .eq('id', existing.id).eq('status', 'draft').gt('expires_at', new Date().toISOString())
      .select('id').maybeSingle();
    if (error) throw error;
    if (!data) return fail('Design could not be updated', 409);
    return NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('Saving is currently unavailable', 503); }
}
