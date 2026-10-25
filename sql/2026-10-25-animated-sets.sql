-- animated_sets — what Animate Yourself drew, and for whom.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- One row per set, not per still. A set is the unit people think in — "my
-- anime ones" — and it is also the unit that gets metered, so keeping them
-- together means the daily cap is a row count rather than arithmetic.
--
-- user_id is nullable on purpose. A stranger with no account can draw a free
-- set, and that set belongs to a pending pack until they sign up. Metering
-- for those rows runs on ip_hash: a salted hash, never an address, never
-- returned to anybody, and only ever compared with other hashes made the
-- same way.

create table if not exists public.animated_sets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete cascade,
  -- Which pending pack this was drawn for, before there was an account.
  pending_token  uuid references public.pending_packs (token) on delete set null,
  ip_hash        text,
  medium         text not null,
  stills         jsonb not null default '[]'::jsonb,
  credits_spent  integer not null default 0,
  created_at     timestamptz not null default now()
);

-- Eight stills is eight short urls and a pose id each. Generous for that,
-- and enforced here because the client is the part an attacker controls.
alter table public.animated_sets
  drop constraint if exists animated_sets_size;
alter table public.animated_sets
  add constraint animated_sets_size check (pg_column_size(stills) < 20000);

alter table public.animated_sets enable row level security;

-- Creators read their own. There is no insert or update policy for anybody:
-- sets are written by the server with the service role, because a client
-- that could insert here could forge a free set past the daily cap.
drop policy if exists "creators read their own sets" on public.animated_sets;
create policy "creators read their own sets"
  on public.animated_sets
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "creators delete their own sets" on public.animated_sets;
create policy "creators delete their own sets"
  on public.animated_sets
  for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists animated_sets_user on public.animated_sets (user_id, created_at desc);
create index if not exists animated_sets_ip on public.animated_sets (ip_hash, created_at desc);

-- Claiming an anonymous set, when its pack is claimed. security definer
-- because the rows being claimed have no owner yet, so no policy could
-- match them. Returns how many sets moved across.
create or replace function public.claim_animated_sets(p_token uuid, p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  moved integer;
begin
  if p_token is null or p_user is null then
    return 0;
  end if;
  update public.animated_sets
     set user_id = p_user
   where pending_token = p_token and user_id is null;
  get diagnostics moved = row_count;
  return moved;
end
$$;

revoke all on function public.claim_animated_sets(uuid, uuid) from public;

-- Verify, after running the above:
--
--   select count(*) from public.animated_sets;   -- 0, and no error
--
-- And from a signed-out browser console on the site:
--
--   await supabase.from('animated_sets').select('id')   -- []
