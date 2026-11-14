-- Occentra guest designs: run once in Supabase SQL Editor.
-- Private bearer tokens must be generated server-side and stored only as SHA-256 hashes.
-- No anon/authenticated RLS policies: all access is through trusted server endpoints.
create table if not exists public.guest_designs (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 template_id text not null,
 category text not null check (category in ('cv','baby','birthday','wedding')),
 title text not null default 'Untitled',
 fields jsonb not null default '{}'::jsonb,
 settings jsonb not null default '{}'::jsonb,
 status text not null default 'draft' check (status in ('draft','paid')),
 purchase_id uuid unique references public.purchases(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '30 days'),
 warning_7d_sent_at timestamptz,
 warning_1d_sent_at timestamptz,
 constraint guest_design_expiry_fixed check (expires_at = created_at + interval '30 days')
);
create index if not exists guest_designs_expiry_idx on public.guest_designs(expires_at);
alter table public.guest_designs enable row level security;
revoke all on public.guest_designs from anon, authenticated;
-- No client access is granted, even when the bearer token is known.
-- The trusted server must check token hash and expiry on every operation.
-- Server must allow updates to fields/settings only while status='draft'.
-- Payment status must be changed only after verified Payfast ITN and order matching.
-- To prevent accidental edits after payment, enforce immutable paid content at DB level.
create or replace function public.occentra_guard_guest_design()
returns trigger language plpgsql set search_path = public as $$
begin
 if tg_op = 'UPDATE' then
   if old.status = 'paid' and (
     new.fields is distinct from old.fields or
     new.settings is distinct from old.settings or
     new.template_id is distinct from old.template_id or
     new.category is distinct from old.category or
     new.title is distinct from old.title or
     new.status is distinct from old.status
   ) then
     raise exception 'Paid designs cannot be edited';
   end if;
   if new.created_at is distinct from old.created_at or new.expires_at is distinct from old.expires_at or new.token_hash is distinct from old.token_hash then
     raise exception 'Guest access lifetime and token cannot be changed';
   end if;
 end if;
 new.updated_at := now();
 return new;
end $$;
drop trigger if exists occentra_guest_design_guard on public.guest_designs;
create trigger occentra_guest_design_guard before update on public.guest_designs
for each row execute function public.occentra_guard_guest_design();
-- Run this from a protected scheduled server job (not from a public browser request).
create or replace function public.occentra_delete_expired_guest_designs()
returns integer language plpgsql security invoker set search_path = public as $$
declare deleted_count integer;
begin
 delete from public.guest_designs where expires_at <= now();
 get diagnostics deleted_count = row_count;
 return deleted_count;
end $$;
revoke all on function public.occentra_delete_expired_guest_designs() from public, anon, authenticated;
-- Do not delete purchases; legally required transaction records remain.
