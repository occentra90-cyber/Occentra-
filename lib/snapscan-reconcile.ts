import { createClient } from '@supabase/supabase-js';
import { fetchSnapscanPayments, reconcileWith, type ReconcileResult } from './snapscan-reconcile-core';
import { SnapscanError } from './snapscan-errors';

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SnapscanError('not_configured', 'supabase');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Webhook notifications, customer status checks and receipt recovery all call this.
 * The decision logic lives in snapscan-reconcile-core.ts so it can be tested without
 * a live database. See that file for the verification rules.
 */
export async function reconcileSnapscanPayment(reference: string, notifiedId?: number): Promise<ReconcileResult> {
  const apiKey = process.env.SNAPSCAN_API_KEY;
  if (!apiKey) throw new SnapscanError('not_configured', 'snapscan api key');
  return reconcileWith({ db: database(), lookup: ref => fetchSnapscanPayments(ref, apiKey) }, reference, notifiedId);
}
