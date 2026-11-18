import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createSnapscanPaymentUrl, isMatchingSnapscanPayment, isAuthenticSnapscanWebhook } from '../lib/snapscan.ts';
import { selectSnapscanOrder } from '../lib/snapscan-order.ts';
import { SnapscanError, describeSnapscanFailure, fromDatabaseError } from '../lib/snapscan-errors.ts';
import { fetchSnapscanPayments, reconcileWith } from '../lib/snapscan-reconcile-core.ts';

test('a new checkout replaces an old pending order, including after return', () => {
  const old = '11111111-1111-4111-8111-111111111111';
  const current = '22222222-2222-4222-8222-222222222222';
  assert.equal(selectSnapscanOrder({checkout:current,returned:old,stored:old}),current);
  assert.equal(selectSnapscanOrder({returned:current,stored:old}),current);
  assert.equal(selectSnapscanOrder({stored:old}),old);
});

test('an invalid return order cannot mask a valid saved checkout', () => {
  const saved = 'a0579bfd-9f56-4f86-a71e-1e9ee37e5fbd';
  assert.equal(selectSnapscanOrder({returned:'not-an-order',stored:saved}),saved);
  assert.equal(selectSnapscanOrder({checkout:'BAD',stored:saved}),saved);
  assert.equal(selectSnapscanOrder({checkout:'invalid',returned:'',stored:'invalid'}),'');
});

test('builds a fixed-amount, strictly referenced QR URL without exposing a private token', () => {
  const url = new URL(createSnapscanPaymentUrl('order-123', 2000, '/'));
  assert.equal(url.origin, 'https://pos.snapscan.io');
  assert.equal(url.searchParams.get('amount'), '2000');
  assert.equal(url.searchParams.get('id'), 'order-123');
  assert.equal(url.searchParams.get('strict'), 'true');
  assert.equal(url.searchParams.get('r_url'), 'https://occentra-occentra.vercel.app/?payment=returned&provider=snapscan');
  assert.equal(url.searchParams.has('s_url'), false);
  assert.equal(url.searchParams.has('f_url'), false);
  assert.ok(url.toString().length <= 256);
  assert.ok(!url.toString().includes('design='));
});

test('cover-letter QR also fits the SnapScan 256-character limit', () => {
  const url = new URL(createSnapscanPaymentUrl('a0579bfd-9f56-4f86-a71e-1e9ee37e5fbd', 1500, '/cover-letters?template=executive'));
  assert.ok(url.toString().length <= 256);
  assert.equal(url.searchParams.get('r_url'), 'https://occentra-occentra.vercel.app/cover-letters?template=executive&payment=returned&provider=snapscan');
});

test('returning a cover-letter buyer carries only the order reference across browser contexts', () => {
  const reference = 'a0579bfd-9f56-4f86-a71e-1e9ee37e5fbd';
  for (const origin of ['https://occentra.vercel.app', 'https://occentra-occentra.vercel.app']) {
    const url = new URL(createSnapscanPaymentUrl(reference, 1500, '/cover-letters?o=' + reference, origin));
    assert.ok(url.toString().length <= 256);
    const returnUrl = new URL(url.searchParams.get('r_url')!);
    assert.equal(returnUrl.searchParams.get('o'), reference);
    assert.equal(returnUrl.searchParams.has('design'), false);
  }
});

test('CV payment return carries the exact order on the same trusted domain', () => {
  const reference = '33333333-3333-4333-8333-333333333333';
  for (const origin of ['https://occentra.vercel.app', 'https://occentra-occentra.vercel.app']) {
    const url = new URL(createSnapscanPaymentUrl(reference, 2000, '/?o=' + reference, origin));
    const returned = new URL(url.searchParams.get('r_url')!);
    assert.equal(returned.origin, origin);
    assert.equal(returned.searchParams.get('o'), reference);
    assert.equal(returned.searchParams.has('design'), false);
    assert.ok(url.toString().length <= 256);
  }
});

test('return URL stays on the customer\'s trusted Occentra domain', () => {
  const url = new URL(createSnapscanPaymentUrl('order-123', 1500, '/cover-letters?template=sage', 'https://occentra.vercel.app'));
  assert.equal(url.searchParams.get('r_url'), 'https://occentra.vercel.app/cover-letters?template=sage&payment=returned&provider=snapscan');
  assert.ok(url.toString().length <= 256);
  assert.throws(() => createSnapscanPaymentUrl('order-123', 1500, '/', 'https://untrusted.example'), /Invalid payment return origin/);
});

test('recognises only exact completed payment, amount and merchant reference', () => {
  const valid = { id: 881, status: 'completed', merchantReference: 'order-123',
    totalAmount: 2000, requiredAmount: 2000, transactionType: 'payment' };
  assert.equal(isMatchingSnapscanPayment(valid, 'order-123', 2000), true);
  assert.equal(isMatchingSnapscanPayment({ ...valid, totalAmount: 1500 }, 'order-123', 2000), false);
  assert.equal(isMatchingSnapscanPayment({ ...valid, merchantReference: 'other' }, 'order-123', 2000), false);
  assert.equal(isMatchingSnapscanPayment({ ...valid, status: 'pending' }, 'order-123', 2000), false);
  assert.equal(isMatchingSnapscanPayment({ ...valid, transactionType: 'refund' }, 'order-123', 2000), false);
  assert.equal(isMatchingSnapscanPayment({ ...valid, requiredAmount: null }, 'order-123', 2000), false);
});

test('validates the exact URL-encoded webhook body with constant-time HMAC comparison', () => {
  const key = 'test-webhook-key';
  const original = 'payload=%7B%22id%22%3A42%2C%22status%22%3A%22completed%22%7D';
  const signature = createHmac('sha256', key).update(original).digest('hex');
  const authorization = 'SnapScan signature=' + signature;
  assert.equal(isAuthenticSnapscanWebhook(original, authorization, key), true);
  assert.equal(isAuthenticSnapscanWebhook(original + '&extra=1', authorization, key), false);
  assert.equal(isAuthenticSnapscanWebhook(original, authorization, 'another-key'), false);
  assert.equal(isAuthenticSnapscanWebhook(original, 'SnapScan signature=invalid', key), false);
  assert.equal(isAuthenticSnapscanWebhook(original, null, key), false);
});

// ---------------------------------------------------------------------------
// Added: amount matching, URL headroom, SnapScan request format, error mapping,
// and the reconcile state machine (run against an in-memory fake database).
// ---------------------------------------------------------------------------
test('worst-case checkout URLs keep a wide margin under SnapScan\'s 256-character limit', () => {
  const reference = '33333333-3333-4333-8333-333333333333';
  for (const origin of ['https://occentra.vercel.app', 'https://occentra-occentra.vercel.app']) {
    for (const [amount, path] of [[2000, '/?o=' + reference], [1500, '/cover-letters?o=' + reference]] as const) {
      const length = createSnapscanPaymentUrl(reference, amount, path, origin).length;
      assert.ok(length <= 215, 'URL is ' + length + ' characters');
    }
  }
});

test('a paid amount that includes a tip or overpays still matches; a tip never counts toward the price', () => {
  const base = { id: 9, status: 'completed', merchantReference: 'r', requiredAmount: 2000, transactionType: 'payment' };
  assert.equal(isMatchingSnapscanPayment({ ...base, totalAmount: 2000, tipAmount: 0 }, 'r', 2000), true);
  assert.equal(isMatchingSnapscanPayment({ ...base, totalAmount: 2200, tipAmount: 200 }, 'r', 2000), true);
  assert.equal(isMatchingSnapscanPayment({ ...base, totalAmount: 2500, tipAmount: null }, 'r', 2000), true);
  assert.equal(isMatchingSnapscanPayment({ ...base, totalAmount: 2000, tipAmount: 500 }, 'r', 2000), false);
  assert.equal(isMatchingSnapscanPayment({ ...base, totalAmount: 1999 }, 'r', 2000), false);
  assert.equal(isMatchingSnapscanPayment({ ...base, totalAmount: 2000, requiredAmount: 1500 }, 'r', 2000), false);
  assert.equal(isMatchingSnapscanPayment({ ...base, totalAmount: 2000, tipAmount: -100 }, 'r', 2000), false);
});

const REF = 'a0579bfd-9f56-4f86-a71e-1e9ee37e5fbd';
const payment = (over: Record<string, unknown> = {}) => ({
  id: 501, status: 'completed', transactionType: 'payment', merchantReference: REF,
  requiredAmount: 2000, totalAmount: 2000, tipAmount: 0, ...over,
});

test('payment lookup sends the documented authenticated request and classifies failures', async () => {
  let seen: { url: URL; init: RequestInit } | undefined;
  const respond = (status: number, body: unknown, headers: Record<string, string> = {}) => (async (url: URL, init: RequestInit) => {
    seen = { url, init };
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
  }) as unknown as typeof fetch;

  assert.deepEqual(await fetchSnapscanPayments(REF, 'KEY', respond(200, [])), []);
  assert.equal(seen!.url.origin + seen!.url.pathname, 'https://pos.snapscan.io/merchant/api/v1/payments');
  assert.equal(seen!.url.searchParams.get('merchantReference'), REF);
  assert.equal(seen!.url.searchParams.get('status'), 'completed');
  assert.equal((seen!.init.headers as Record<string, string>).Authorization, 'Basic ' + Buffer.from('KEY:').toString('base64'));

  const code = async (f: typeof fetch) => { try { await fetchSnapscanPayments(REF, 'KEY', f); return 'none'; } catch (e) { return (e as SnapscanError).code; } };
  assert.equal(await code(respond(429, '', { 'retry-after': '7' })), 'upstream_rate_limited');
  assert.equal(await code(respond(401, '')), 'upstream_auth');
  assert.equal(await code(respond(503, '')), 'upstream_unavailable');
  assert.equal(await code(respond(400, '')), 'upstream_bad_response');
  assert.equal(await code(respond(200, '<html>')), 'upstream_bad_response');
  assert.equal(await code(respond(200, { not: 'an array' })), 'upstream_bad_response');
  assert.equal(await code((async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch), 'upstream_unavailable');
  try { await fetchSnapscanPayments(REF, 'KEY', respond(429, '', { 'retry-after': '7' })); } catch (e) { assert.equal((e as SnapscanError).retryAfterSeconds, 7); }
});

test('failures map to retry (503 + Retry-After) or needs-a-human (409), with a stable code', () => {
  const busy = describeSnapscanFailure(new SnapscanError('upstream_rate_limited', 'HTTP 429', 7));
  assert.equal(busy.status, 503); assert.equal(busy.headers['Retry-After'], '7'); assert.equal(busy.body.retryable, true);
  const conflict = describeSnapscanFailure(new SnapscanError('payment_id_conflict'));
  assert.equal(conflict.status, 409); assert.equal('Retry-After' in conflict.headers, false);
  assert.equal(fromDatabaseError({ code: '23505' }).code, 'payment_id_conflict');
  assert.equal(fromDatabaseError({ code: 'P0001' }).retryable, false);
  assert.equal(fromDatabaseError({ code: '08006' }).retryable, true);
  assert.equal(describeSnapscanFailure(new Error('boom')).status, 503);
  assert.ok(!JSON.stringify(describeSnapscanFailure(new Error('SECRET-KEY-123')).body).includes('SECRET'));
});

type Row = Record<string, unknown>;
function fakeDb(tables: { purchases: Row[]; guest_designs: Row[] }) {
  const from = (table: 'purchases' | 'guest_designs') => {
    let patch: Row | null = null;
    const filters: [string, unknown][] = [];
    const rows = () => tables[table].filter(r => filters.every(([c, v]) => r[c] === v));
    const api: Record<string, unknown> = {
      select: () => api,
      update: (p: Row) => { patch = p; return api; },
      eq: (c: string, v: unknown) => { filters.push([c, v]); return api; },
      maybeSingle: async () => ({ data: rows()[0] ? { ...rows()[0] } : null, error: null }),
      then: (resolve: (v: unknown) => unknown) => { if (patch) for (const r of rows()) Object.assign(r, patch); return resolve({ error: null }); },
    };
    return api;
  };
  return { from } as never;
}
function scenario(over: { order?: Row; design?: Row | null } = {}) {
  const purchases: Row[] = [{ id: 'p1', merchant_reference: REF, template_id: 'cv-1', amount_cents: 2000, currency: 'ZAR',
    status: 'pending', payment_provider: 'snapscan', snapscan_payment_id: null, ...over.order }];
  const guest_designs: Row[] = over.design === null ? [] : [{ id: 'd1', template_id: 'cv-1', status: 'draft', purchase_id: 'p1',
    expires_at: new Date(Date.now() + 3600_000).toISOString(), ...over.design }];
  let lookups = 0;
  return { purchases, guest_designs, get lookups() { return lookups; },
    run: (list: unknown[] | Error, notifiedId?: number) => reconcileWith({ db: fakeDb({ purchases, guest_designs }),
      lookup: async () => { lookups++; if (list instanceof Error) throw list; return list; } }, REF, notifiedId) };
}

test('reconcile: verified payment unlocks the order and design exactly once', async () => {
  const s = scenario();
  assert.equal(await s.run([payment()]), 'paid');
  assert.equal(s.purchases[0].status, 'paid'); assert.equal(s.purchases[0].snapscan_payment_id, '501');
  assert.equal(s.guest_designs[0].status, 'paid');
  assert.equal(await s.run([payment()]), 'paid');
  assert.equal(s.lookups, 1, 'an unlocked order must not re-query SnapScan');
});

test('reconcile: a tipped or overpaid payment unlocks (previously stuck on "pending" forever)', async () => {
  const s = scenario();
  assert.equal(await s.run([payment({ totalAmount: 2300, tipAmount: 300 })]), 'paid');
  assert.equal(s.guest_designs[0].status, 'paid');
});

test('reconcile: nothing is unlocked without a matching completed payment', async () => {
  for (const list of [[], [payment({ merchantReference: 'other' })], [payment({ requiredAmount: 1500 })],
    [payment({ totalAmount: 1000 })], [payment({ status: 'pending' })], [payment({ transactionType: 'refund' })]]) {
    const s = scenario();
    assert.equal(await s.run(list), 'pending');
    assert.equal(s.purchases[0].status, 'pending'); assert.equal(s.guest_designs[0].status, 'draft');
  }
  const s = scenario();
  assert.equal(await s.run([payment({ id: 7 })], 8), 'pending', 'a notification for another payment id must not unlock');
});

test('reconcile: a verified payment is still recorded when the saved design is gone or its draft window lapsed', async () => {
  const gone = scenario({ design: null });
  assert.equal(await gone.run([payment()]), 'paid'); assert.equal(gone.purchases[0].status, 'paid');
  assert.equal(await gone.run([payment()]), 'paid');
  const lapsed = scenario({ design: { expires_at: new Date(Date.now() - 86_400_000).toISOString() } });
  assert.equal(await lapsed.run([payment()]), 'paid'); assert.equal(lapsed.guest_designs[0].status, 'paid');
});

test('reconcile: an interrupted unlock (purchase paid, design still draft) heals on the next check', async () => {
  const s = scenario({ order: { status: 'paid', snapscan_payment_id: '501' } });
  assert.equal(await s.run([payment()]), 'paid');
  assert.equal(s.guest_designs[0].status, 'paid');
});

test('reconcile: conflicts and bad orders fail with non-retryable codes; SnapScan trouble is retryable and changes nothing', async () => {
  const code = async (s: ReturnType<typeof scenario>, list: unknown[] | Error, id?: number) => {
    try { await s.run(list, id); return 'none'; } catch (e) { return `${(e as SnapscanError).code}:${(e as SnapscanError).retryable}`; }
  };
  // Fully unlocked order + a notification for a different payment id: acknowledge-and-flag, never re-unlock.
  assert.equal(await code(scenario({ order: { status: 'paid', snapscan_payment_id: '5' }, design: { status: 'paid' } }), [payment()], 6), 'payment_id_conflict:false');
  // A plain status check on an unlocked order just reports paid.
  assert.equal(await code(scenario({ order: { status: 'paid', snapscan_payment_id: '5' }, design: { status: 'paid' } }), [payment({ id: 6 })]), 'none');
  // Order already paid by payment 5, but SnapScan shows a different completed payment 501: conflict, nothing overwritten.
  const other = scenario({ order: { status: 'paid', snapscan_payment_id: '5' } });
  assert.equal(await code(other, [payment()]), 'payment_id_conflict:false');
  assert.equal(other.purchases[0].snapscan_payment_id, '5'); assert.equal(other.guest_designs[0].status, 'draft');
  assert.equal(await code(scenario({ order: { status: 'cancelled' } }), [payment()]), 'order_closed:false');
  assert.equal(await code(scenario({ order: { amount_cents: 1 } }), [payment()]), 'order_mismatch:false');
  assert.equal(await code(scenario({ design: { template_id: 'cv-2' } }), [payment()]), 'order_mismatch:false');
  const busy = scenario();
  assert.equal(await code(busy, new SnapscanError('upstream_rate_limited', 'HTTP 429', 5)), 'upstream_rate_limited:true');
  assert.equal(busy.purchases[0].status, 'pending'); assert.equal(busy.guest_designs[0].status, 'draft');
});

test('reconcile: unknown references and legacy Payfast orders are reported as not found', async () => {
  const none = scenario();
  none.purchases.length = 0;
  assert.equal(await none.run([payment()]), 'unknown');
  assert.equal(await scenario({ order: { payment_provider: 'payfast' } }).run([payment()]), 'unknown');
});
