import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { reconcileSnapscanPayment } from '../../../../lib/snapscan-reconcile';
import { snapscanVerificationConfigured } from '../../../../lib/snapscan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const respond = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * A lost browser return must not strand a legitimate paid order.
 * The receipt order number is not sufficient proof: the shared reconciliation
 * routine checks the DB record and SnapScan's authenticated completed payment.
 * This route never returns or creates a private design token.
 */
export async function POST(request: Request) {
  if (!snapscanVerificationConfigured()) return respond({ error: 'Payment verification unavailable' }, 503);
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return respond({ error: 'Invalid website origin' }, 403);
  try {
    if (Number(request.headers.get('content-length') || 0) > 1024) return respond({ error: 'Request too large' }, 413);
    const body = await request.json();
    const reference = typeof body?.reference === 'string' ? body.reference.trim().toLowerCase() : '';
    if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(reference)) {
      return respond({ error: 'Enter the complete SnapScan order number' }, 400);
    }
    const result = await reconcileSnapscanPayment(reference);
    console.info('SnapScan trace', { event: 'receipt_reconciled', reference, result });
    if (result === 'paid') {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: order, error: orderError } = await db.from('purchases')
        .select('template_id').eq('merchant_reference', reference).maybeSingle();
      if (orderError) throw orderError;
      // A verified receipt restores entitlement to its purchased template,
      // never to a private CV or cover-letter draft containing personal data.
      if (!order || !/^(cv-[0-5]|cover-(classic|navy|sage|executive))$/.test(order.template_id)) {
        return respond({ error: 'This receipt is not for an available template' }, 400);
      }
      return respond({ paid: true, found: true, templateId: order.template_id });
    }
    return respond({ paid: false, found: result !== 'unknown' });
  } catch (error) {
    // Supabase returns structured errors which are not Error instances.
    // Log only the diagnostic code/category; never credentials or private tokens.
    const diagnostic = error instanceof Error ? error.message :
      error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? 'database code ' + error.code : 'unknown';
    console.error('SnapScan receipt reconciliation failed:', diagnostic);
    return respond({ error: 'Unable to verify with SnapScan right now' }, 503);
  }
}
