import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || '';
  const received = request.headers.get('authorization') || '';
  const expected = 'Bearer ' + secret;
  if (!secret || received.length !== expected.length ||
      !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: Record<string, string> = {
    snapscan_api_key: process.env.SNAPSCAN_API_KEY ? 'ok' : 'missing',
    snapscan_webhook_key: process.env.SNAPSCAN_WEBHOOK_AUTH_KEY ? 'ok' : 'missing',
    checkout_enabled: process.env.SNAPSCAN_CHECKOUT_ENABLED === 'true' ? 'on' : 'off',
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing',
    supabase_service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing',
  };

  if (process.env.SNAPSCAN_API_KEY) {
    try {
      const url = new URL('https://pos.snapscan.io/merchant/api/v1/payments');
      url.searchParams.set('merchantReference', '00000000-0000-4000-8000-000000000000');
      url.searchParams.set('status', 'completed');
      const response = await fetch(url, {
        headers: { Authorization: 'Basic ' + Buffer.from(process.env.SNAPSCAN_API_KEY + ':').toString('base64') },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      checks.snapscan_api = response.ok ? 'ok' : response.status === 401 || response.status === 403 ? 'authentication_failed' : 'upstream_error';
    } catch { checks.snapscan_api = 'unreachable'; }
  } else checks.snapscan_api = 'skipped';

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } });
      const purchases = await db.from('purchases').select('id,payment_provider,snapscan_payment_id').limit(1);
      const designs = await db.from('guest_designs').select('id,purchase_id').limit(1);
      checks.purchases_schema = purchases.error ? 'database_error' : 'ok';
      checks.designs_schema = designs.error ? 'database_error' : 'ok';
    } catch { checks.purchases_schema = checks.designs_schema = 'unreachable'; }
  } else checks.purchases_schema = checks.designs_schema = 'skipped';

  const ok = Object.entries(checks).every(([key, value]) => key === 'checkout_enabled' || value === 'ok');
  return NextResponse.json({ ok, checks }, {
    status: ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
