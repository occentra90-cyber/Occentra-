-- Apply in the Supabase SQL Editor BEFORE enabling SnapScan checkout.
-- Existing orders remain Payfast; SnapScan transaction IDs cannot be reused.
alter table public.purchases
  add column if not exists payment_provider text not null default 'payfast';
alter table public.purchases
  drop constraint if exists purchases_payment_provider_check;
alter table public.purchases
  add constraint purchases_payment_provider_check
  check (payment_provider in ('payfast', 'snapscan'));
alter table public.purchases
  add column if not exists snapscan_payment_id text;
create unique index if not exists purchases_snapscan_payment_id_unique
  on public.purchases(snapscan_payment_id) where snapscan_payment_id is not null;
