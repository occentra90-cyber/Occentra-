import { NextResponse } from 'next/server';
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
    console.info('SnapScan receipt reconciliation:', result, reference.slice(-6));
    return respond({ paid: result === 'paid', found: result !== 'unknown' });
  } catch (error) {
    console.error('SnapScan receipt reconciliation failed:', error instanceof Error ? error.message : 'unknown');
    return respond({ error: 'Unable to verify with SnapScan right now' }, 503);
  }
}
