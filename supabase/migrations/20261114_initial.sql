-- Occentra initial database schema
-- Run in Supabase SQL Editor. Tables are inaccessible to anonymous users.
create extension if not exists pgcrypto;

create table if not exists public.customer_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  category text not null check (category in ('cv','baby','birthday','wedding')),
  title text not null default 'Untitled',
  fields jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_drafts_user_id_idx on public.customer_drafts(user_id);
alter table public.customer_drafts enable row level security;
create policy "Customers read own drafts" on public.customer_drafts for select to authenticated using (user_id = (select auth.uid()));
create policy "Customers create own drafts" on public.customer_drafts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Customers edit own drafts" on public.customer_drafts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Customers delete own drafts" on public.customer_drafts for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  merchant_reference text not null unique,
  template_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded')),
  payfast_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists purchases_user_id_idx on public.purchases(user_id);
alter table public.purchases enable row level security;
create policy "Customers read own purchases" on public.purchases for select to authenticated using (user_id = (select auth.uid()));
-- No customer insert/update/delete policy: payment status must only be set by
-- a trusted server after verified Payfast ITN confirmation.
