import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createSnapscanPaymentUrl, isMatchingSnapscanPayment, isAuthenticSnapscanWebhook } from '../lib/snapscan.ts';

test('builds a fixed-amount, strictly referenced QR URL without exposing a private token', () => {
  const url = new URL(createSnapscanPaymentUrl('order-123', 2000, '/'));
  assert.equal(url.origin, 'https://pos.snapscan.io');
  assert.equal(url.searchParams.get('amount'), '2000');
  assert.equal(url.searchParams.get('id'), 'order-123');
  assert.equal(url.searchParams.get('strict'), 'true');
  assert.equal(url.searchParams.get('s_url'), 'https://occentra-occentra.vercel.app/?payment=returned&provider=snapscan');
  assert.ok(!url.toString().includes('design='));
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
