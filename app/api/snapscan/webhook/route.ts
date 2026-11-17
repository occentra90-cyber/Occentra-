import { NextResponse } from 'next/server';
import { isAuthenticSnapscanWebhook, snapscanVerificationConfigured } from '../../../../lib/snapscan';
import { reconcileSnapscanPayment } from '../../../../lib/snapscan-reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const webhookKey = process.env.SNAPSCAN_WEBHOOK_AUTH_KEY;
  if (!webhookKey || !snapscanVerificationConfigured()) {
    console.warn('SnapScan trace', { event: 'webhook_not_configured' });
    return new NextResponse('Webhook not configured', { status: 503 });
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/x-www-form-urlencoded') {
    console.warn('SnapScan trace', { event: 'webhook_content_type_rejected' });
    return new NextResponse('Unsupported webhook payload', { status: 415 });
  }
  try {
    const rawBody = await request.text();
    if (rawBody.length > 20000) return new NextResponse('Payload too large', { status: 413 });
    if (!isAuthenticSnapscanWebhook(rawBody, request.headers.get('authorization'), webhookKey)) {
      console.warn('SnapScan trace', { event: 'webhook_signature_rejected' });
      return new NextResponse('Invalid webhook signature', { status: 401 });
    }
    const payloadText = new URLSearchParams(rawBody).get('payload');
    if (!payloadText) return new NextResponse('Missing payment payload', { status: 400 });
    let payload: unknown;
    try { payload = JSON.parse(payloadText); }
    catch { return new NextResponse('Invalid payment JSON', { status: 400 }); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return new NextResponse('Invalid payment payload', { status: 400 });
    const payment = payload as Record<string, unknown>;
    console.info('SnapScan trace', {
      event: 'webhook_received',
      reference: typeof payment.merchantReference === 'string' ? payment.merchantReference : null,
      status: typeof payment.status === 'string' ? payment.status : 'unknown',
    });
    // Ignore unsuccessful payments. Only an independently verified completed
    // transaction may unlock the saved design.
    if (payment.status !== 'completed') return new NextResponse('Notification received', { status: 200 });
    if (typeof payment.merchantReference !== 'string' ||
        !/^[a-f0-9-]{36}$/i.test(payment.merchantReference) ||
        typeof payment.id !== 'number' || !Number.isSafeInteger(payment.id) || payment.id <= 0) {
      return new NextResponse('Invalid payment identifier', { status: 400 });
    }
    const status = await reconcileSnapscanPayment(payment.merchantReference, payment.id);
    console.info('SnapScan trace', { event: 'webhook_reconciled', reference: payment.merchantReference, result: status });
    return new NextResponse(status === 'pending' ? 'Verification pending' : 'Notification confirmed',
      { status: status === 'pending' ? 503 : 200 });
  } catch (error) {
    // SnapScan retries non-200 responses for transient failures.
    console.error('SnapScan trace', { event: 'webhook_verification_failed', category: error instanceof Error ? error.name : 'unknown' });
    return new NextResponse('Verification temporarily unavailable', { status: 503 });
  }
}
