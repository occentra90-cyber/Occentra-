-- Run in Supabase SQL Editor before testing cover letter checkout.
-- Extend only the temporary guest design category allowlist.
alter table public.guest_designs
  drop constraint if exists guest_designs_category_check;
alter table public.guest_designs
  add constraint guest_designs_category_check
  check (category in ('cv','baby','birthday','wedding','cover'));
