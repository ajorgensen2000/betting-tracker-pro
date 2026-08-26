-- Betting Tracker Pro V2 update
-- Run this once in Supabase SQL Editor before using editable stake percentage.
alter table public.user_settings
add column if not exists stake_percentage numeric(6,3) not null default 2 check(stake_percentage > 0 and stake_percentage <= 100);
