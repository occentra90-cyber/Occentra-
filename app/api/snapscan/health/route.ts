import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { fetchSnapscanPayments } from '../../../../lib/snapscan-reconcile-core';
import { SnapscanError } from '../../../../lib/snapscan-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Operator-only diagnostics: curl -H "Authorization: Bearer $CRON_SECRET" <site>/api/snapscan/health
 * Reports which dependency is broken (env, SnapScan API key, database access, migration)
 * using pass/fail and error codes only. It never returns keys, URLs or customer data.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || '';
  const given = request.headers.get('authorization') || '';
  const expected = 'Bearer ' + secret;
  const authorised = Boolean(secret) && given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!authorised) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const checks: Record<string, string> = {
    env_snapscan_api_key: process.env.SNAPSCAN_API_KEY ? 'ok' : 'missing',
    env_webhook_auth_key: process.env.SNAPSCAN_WEBHOOK_AUTH_KEY ? 'ok' : 'missing',
    env_checkout_enabled: process.env.SNAPSCAN_CHECKOUT_ENABLED === 'true' ? 'on' : 'off',
    env_supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing',
    env_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing',
  };

  // SnapScan: an authenticated lookup for a reference that cannot exist must return 200 with an empty list.
  if (process.env.SNAPSCAN_API_KEY) {
    try {
      await fetchSnapscanPayments('00000000-0000-4000-8000-000000000000', process.env.SNAPSCAN_API_KEY);
      checks.snapscan_api = 'ok';
    } catch (error) { checks.snapscan_api = error instanceof SnapscanError ? error.code + (error.detail ? ' (' + error.detail + ')' : '') : 'failed'; }
  } else checks.snapscan_api = 'skipped';

  // Supabase: the service-role key must be able to read both tables, and the SnapScan migration must exist.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const purchases = await db.from('purchases').select('id,payment_provider,snapscan_payment_id').limit(1);
    checks.db_purchases_and_migration = purchases.error ? 'failed (postgres ' + (purchases.error.code || 'unknown') + ')' : 'ok';
    const designs = await db.from('guest_designs').select('id,purchase_id').limit(1);
    checks.db_guest_designs = designs.error ? 'failed (postgres ' + (designs.error.code || 'unknown') + ')' : 'ok';
  } else checks.db_purchases_and_migration = checks.db_guest_designs = 'skipped';

  const ok = Object.entries(checks).every(([key, value]) => key === 'env_checkout_enabled' || value === 'ok');
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
