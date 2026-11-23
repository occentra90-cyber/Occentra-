-- Run in the Supabase SQL Editor BEFORE selling animated GIFs.
-- Allows saved GIF designs (R50 ready-made, R100 make-your-own). Safe to re-run.
-- Purchases need no change: template ids gif-* are priced on the server and SnapScan
-- verification works exactly as for CVs and cover letters.
alter table public.guest_designs
  drop constraint if exists guest_designs_category_check;
alter table public.guest_designs
  add constraint guest_designs_category_check
  check (category in ('cv','baby','birthday','wedding','cover','gif'));
