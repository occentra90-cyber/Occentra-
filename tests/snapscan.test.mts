import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createSnapscanPaymentUrl, isMatchingSnapscanPayment, isAuthenticSnapscanWebhook } from '../lib/snapscan.ts';
import { selectSnapscanOrder } from '../lib/snapscan-order.ts';
import { fetchSnapscanPayments, reconcileWith } from '../lib/snapscan-reconcile-core.ts';
import { SnapscanError, describeSnapscanFailure } from '../lib/snapscan-errors.ts';

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
    assert.equal(returnUrl.searchParams.get('provider'), null);
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
    assert.equal(returned.searchParams.get('provider'), null);
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
  assert.equal(isMatchingSnapscanPayment({ ...valid, totalAmount: 2300, tipAmount: 300 }, 'order-123', 2000), true);
  assert.equal(isMatchingSnapscanPayment({ ...valid, totalAmount: 2400 }, 'order-123', 2000), true);
  assert.equal(isMatchingSnapscanPayment({ ...valid, totalAmount: 2200, tipAmount: 300 }, 'order-123', 2000), false);
  assert.equal(isMatchingSnapscanPayment({ ...valid, totalAmount: 2300, tipAmount: -1 }, 'order-123', 2000), false);
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

test('authenticated payment lookup handles API outages without treating them as unpaid', async () => {
  await assert.rejects(
    fetchSnapscanPayments('test','test',async () => new Response('',{status:503})),
    (error) => error instanceof SnapscanError && error.code === 'upstream_unavailable'
  );
  await assert.rejects(
    fetchSnapscanPayments('test','test',async () => new Response('not json',{status:200})),
    (error) => error instanceof SnapscanError && error.code === 'upstream_bad_response'
  );
});
test('payment failures distinguish retryable outages from permanent conflicts', () => {
  assert.equal(describeSnapscanFailure(new SnapscanError('upstream_rate_limited')).status,503);
  assert.equal(describeSnapscanFailure(new SnapscanError('payment_id_conflict')).status,409);
});

type TestRow = Record<string, unknown>;
function fakePaymentDb(tables: {purchases:TestRow[];guest_designs:TestRow[]}) {
  return {from:(table:'purchases'|'guest_designs')=>{
    let patch:TestRow|null=null;const filters:[string,unknown][]=[];
    const rows=()=>tables[table].filter(row=>filters.every(([key,value])=>row[key]===value));
    const api:Record<string,unknown>={
      select:()=>api,update:(value:TestRow)=>{patch=value;return api;},
      eq:(key:string,value:unknown)=>{filters.push([key,value]);return api;},
      maybeSingle:async()=>({data:rows()[0]?{...rows()[0]}:null,error:null}),
      then:(resolve:(v:unknown)=>unknown)=>{if(patch)for(const row of rows())Object.assign(row,patch);return resolve({error:null});}
    };return api;
  }} as never;
}
function paymentScenario(options:{order?:TestRow;design?:TestRow|null}={}){
  const ref='a0579bfd-9f56-4f86-a71e-1e9ee37e5fbd';
  const purchases:TestRow[]=[{id:'p1',merchant_reference:ref,template_id:'cv-1',amount_cents:2000,currency:'ZAR',status:'pending',payment_provider:'snapscan',snapscan_payment_id:null,...options.order}];
  const guest_designs:TestRow[]=options.design===null?[]:[{id:'d1',template_id:'cv-1',status:'draft',purchase_id:'p1',...options.design}];
  let calls=0;
  const paid=(over:TestRow={})=>({id:501,status:'completed',merchantReference:ref,requiredAmount:2000,totalAmount:2000,transactionType:'payment',...over});
  return {purchases,guest_designs,paid,get calls(){return calls;},
    run:(list:unknown[]|Error,notifiedId?:number)=>reconcileWith({db:fakePaymentDb({purchases,guest_designs}),lookup:async()=>{calls++;if(list instanceof Error)throw list;return list;}},ref,notifiedId)};
}
test('verified SnapScan payment records purchase and unlocks once',async()=>{
  const s=paymentScenario();assert.equal(await s.run([s.paid()]),'paid');
  assert.equal(s.purchases[0].snapscan_payment_id,'501');assert.equal(s.guest_designs[0].status,'paid');
  assert.equal(await s.run([s.paid()]),'paid');assert.equal(s.calls,1);
});
test('tipped payment records and unlocks',async()=>{
  const s=paymentScenario();assert.equal(await s.run([s.paid({totalAmount:2300,tipAmount:300})]),'paid');
});
test('unmatched or incomplete payment never unlocks',async()=>{
  for(const over of [{status:'pending'},{merchantReference:'wrong'},{requiredAmount:1500},{totalAmount:1500},{transactionType:'refund'}]){
    const s=paymentScenario();assert.equal(await s.run([s.paid(over)]),'pending');
    assert.equal(s.purchases[0].status,'pending');assert.equal(s.guest_designs[0].status,'draft');
  }
});
test('missing draft still records a verified payment',async()=>{
  const s=paymentScenario({design:null});assert.equal(await s.run([s.paid()]),'paid');assert.equal(s.purchases[0].status,'paid');
});
test('interrupted purchase payment can finish unlocking',async()=>{
  const s=paymentScenario({order:{status:'paid',snapscan_payment_id:'501'}});
  assert.equal(await s.run([s.paid()]),'paid');assert.equal(s.guest_designs[0].status,'paid');
});
test('different payment ID and invalid order never unlock',async()=>{
  const a=paymentScenario({order:{status:'paid',snapscan_payment_id:'123'}});
  await assert.rejects(a.run([a.paid()]),(e)=>e instanceof SnapscanError&&e.code==='payment_id_conflict');
  const b=paymentScenario({order:{amount_cents:1}});
  await assert.rejects(b.run([b.paid()]),(e)=>e instanceof SnapscanError&&e.code==='order_mismatch');
});
test('SnapScan outage does not change pending purchase',async()=>{
  const s=paymentScenario();await assert.rejects(s.run(new SnapscanError('upstream_unavailable')),(e)=>e instanceof SnapscanError&&e.retryable);
  assert.equal(s.purchases[0].status,'pending');
});
test('unknown reference and legacy provider do not unlock',async()=>{
  const s=paymentScenario();s.purchases.length=0;assert.equal(await s.run([s.paid()]),'unknown');
  const legacy=paymentScenario({order:{payment_provider:'payfast'}});
  assert.equal(await legacy.run([legacy.paid()]),'unknown');
});
