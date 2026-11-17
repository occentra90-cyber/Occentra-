-- Apply after 20261117_snapscan.sql, after checking existing rows.
-- A SnapScan purchase must not be marked paid without a stored transaction ID.
-- Preflight: SELECT id, merchant_reference FROM public.purchases
-- WHERE payment_provider='snapscan' AND status='paid' AND snapscan_payment_id IS NULL;
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_snapscan_paid_requires_payment_id
  CHECK (payment_provider <> 'snapscan' OR status <> 'paid' OR snapscan_payment_id IS NOT NULL);
