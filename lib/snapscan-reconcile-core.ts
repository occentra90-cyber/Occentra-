import type { SupabaseClient } from '@supabase/supabase-js';
import { isMatchingSnapscanPayment, type SnapscanPayment } from './snapscan';
import { SnapscanError, fromDatabaseError } from './snapscan-errors';
export type ReconcileResult = 'paid' | 'pending' | 'unknown';
export type PaymentLookup = (reference: string) => Promise<unknown[]>;
export function expectedAmount(templateId: string) {
  if (/^cv-[0-5]$/.test(templateId)) return 2000;
  if (/^cover-(classic|navy|sage|executive)$/.test(templateId)) return 1500;
  return null;
}
export async function fetchSnapscanPayments(reference: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<unknown[]> {
  const url = new URL('https://pos.snapscan.io/merchant/api/v1/payments');
  url.searchParams.set('merchantReference', reference);
  url.searchParams.set('status', 'completed');
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: 'Basic ' + Buffer.from(apiKey + ':').toString('base64'), Accept: 'application/json' },
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
  } catch (error) { throw new SnapscanError('upstream_unavailable', error instanceof Error ? error.name : 'network'); }
  if (response.status === 429) {
    const wait = Number(response.headers.get('retry-after'));
    throw new SnapscanError('upstream_rate_limited', 'HTTP 429', Number.isFinite(wait) && wait > 0 ? Math.min(wait,60) : 10);
  }
  if (response.status === 401 || response.status === 403) throw new SnapscanError('upstream_auth', 'HTTP '+response.status);
  if (response.status >= 500) throw new SnapscanError('upstream_unavailable', 'HTTP '+response.status);
  if (!response.ok) throw new SnapscanError('upstream_bad_response', 'HTTP '+response.status);
  let payments: unknown;
  try { payments = await response.json(); } catch { throw new SnapscanError('upstream_bad_response','invalid JSON'); }
  if (!Array.isArray(payments)) throw new SnapscanError('upstream_bad_response','not an array');
  return payments;
}
export async function reconcileWith(
  deps: {db: SupabaseClient; lookup: PaymentLookup}, reference: string, notifiedId?: number,
): Promise<ReconcileResult> {
  const {db,lookup}=deps;
  const {data:order,error:orderError}=await db.from('purchases')
    .select('id,merchant_reference,template_id,amount_cents,currency,status,payment_provider,snapscan_payment_id')
    .eq('merchant_reference',reference).maybeSingle();
  if(orderError) throw fromDatabaseError(orderError);
  if(!order || order.payment_provider!=='snapscan') return 'unknown';
  if(order.currency!=='ZAR' || order.amount_cents!==expectedAmount(order.template_id))
    throw new SnapscanError('order_mismatch','amount or currency');
  if(order.status!=='pending' && order.status!=='paid') throw new SnapscanError('order_closed',String(order.status));
  const {data:design,error:designError}=await db.from('guest_designs')
    .select('id,template_id,status,purchase_id').eq('purchase_id',order.id).maybeSingle();
  if(designError) throw fromDatabaseError(designError);
  if(design && design.template_id!==order.template_id) throw new SnapscanError('order_mismatch','design template');
  if(order.status==='paid' && (!design || design.status==='paid') && order.snapscan_payment_id){
    if(notifiedId!==undefined && order.snapscan_payment_id!==String(notifiedId))
      throw new SnapscanError('payment_id_conflict','different notification');
    return 'paid';
  }
  const payments=await lookup(reference);
  const matching=(payments as SnapscanPayment[]).find(p=>p && typeof p==='object' &&
    isMatchingSnapscanPayment(p,reference,order.amount_cents) &&
    (notifiedId===undefined || p.id===notifiedId));
  if(!matching) return 'pending';
  const paymentId=String(matching.id);
  if(order.status==='paid' && order.snapscan_payment_id!==paymentId)
    throw new SnapscanError('payment_id_conflict','different order payment');
  if(order.status==='pending'){
    const {error}=await db.from('purchases').update({status:'paid',snapscan_payment_id:paymentId})
      .eq('id',order.id).eq('status','pending');
    if(error) throw fromDatabaseError(error);
  }
  const {data:confirmed,error:confirmError}=await db.from('purchases')
    .select('status,snapscan_payment_id').eq('id',order.id).maybeSingle();
  if(confirmError) throw fromDatabaseError(confirmError);
  if(confirmed?.status==='paid' && confirmed.snapscan_payment_id!==paymentId)
    throw new SnapscanError('payment_id_conflict','concurrent payment');
  if(confirmed?.status!=='paid') throw new SnapscanError('payment_not_confirmed','purchase');
  if(design?.status==='draft'){
    const {error}=await db.from('guest_designs').update({status:'paid'})
      .eq('id',design.id).eq('purchase_id',order.id).eq('status','draft');
    if(error) throw fromDatabaseError(error);
    const {data:updated,error:readError}=await db.from('guest_designs')
      .select('status').eq('id',design.id).maybeSingle();
    if(readError) throw fromDatabaseError(readError);
    if(updated && updated.status!=='paid') throw new SnapscanError('payment_not_confirmed','design');
  }
  return 'paid';
}
