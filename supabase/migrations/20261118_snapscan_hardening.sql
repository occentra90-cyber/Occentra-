-- Apply after 20261117_snapscan.sql. Safe to re-run.
-- Defence in depth for "never unlock without verified payment": a SnapScan order can only be
-- in the 'paid' state if a SnapScan transaction id is stored with it. The application already
-- writes both in one statement; this makes the database refuse any other path.
-- If this fails with "violated by some row", list the offenders first:
--   select id, merchant_reference from public.purchases
--   where payment_provider = 'snapscan' and status = 'paid' and snapscan_payment_id is null;
alter table public.purchases
  drop constraint if exists purchases_snapscan_paid_requires_payment_id;
alter table public.purchases
  add constraint purchases_snapscan_paid_requires_payment_id
  check (payment_provider <> 'snapscan' or status <> 'paid' or snapscan_payment_id is not null);
