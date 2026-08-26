create extension if not exists pgcrypto;

create table if not exists public.bets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.user_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 start_bankroll numeric(12,2) not null default 3000 check(start_bankroll>=0),
 stake_percentage numeric(6,3) not null default 2 check(stake_percentage>0 and stake_percentage<=100),
 updated_at timestamptz not null default now()
);
alter table public.bets enable row level security;
alter table public.user_settings enable row level security;
drop policy if exists "own bets select" on public.bets; drop policy if exists "own bets insert" on public.bets; drop policy if exists "own bets update" on public.bets; drop policy if exists "own bets delete" on public.bets;
create policy "own bets select" on public.bets for select to authenticated using ((select auth.uid())=user_id);
create policy "own bets insert" on public.bets for insert to authenticated with check ((select auth.uid())=user_id);
create policy "own bets update" on public.bets for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own bets delete" on public.bets for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists "own settings select" on public.user_settings; drop policy if exists "own settings insert" on public.user_settings; drop policy if exists "own settings update" on public.user_settings;
create policy "own settings select" on public.user_settings for select to authenticated using ((select auth.uid())=user_id);
create policy "own settings insert" on public.user_settings for insert to authenticated with check ((select auth.uid())=user_id);
create policy "own settings update" on public.user_settings for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index if not exists bets_user_id_idx on public.bets(user_id);
