-- Additive provider metadata for a future Zak Pay integration.
-- IMPORTANT: this migration alone does not activate Zak Pay payments.
-- Existing Payfast purchases keep their provider and legacy payment identifier.

alter table public.purchases
  add column if not exists provider text not null default 'payfast';

alter table public.purchases
  add column if not exists provider_session_id text;

alter table public.purchases
  add column if not exists provider_payment_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'purchases_provider_check'
      and conrelid = 'public.purchases'::regclass
  ) then
    alter table public.purchases
      add constraint purchases_provider_check
      check (provider in ('payfast', 'zakpay'));
  end if;
end $$;

create unique index if not exists purchases_provider_session_unique_idx
  on public.purchases (provider, provider_session_id)
  where provider_session_id is not null;

create unique index if not exists purchases_provider_payment_unique_idx
  on public.purchases (provider, provider_payment_id)
  where provider_payment_id is not null;

-- Preserve existing RLS: customers can read their purchases, but only
-- trusted server-side payment verification can change purchase status.
