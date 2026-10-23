-- Anonymous share links — let a visitor share a scene without an account.
--
-- Run this in the Supabase SQL editor. It reports what it did and is safe to
-- run twice.
--
-- The point of the Rehearsal Studio is that it costs nothing and needs no
-- account, and the payoff — handing someone a link to the scene — was the one
-- thing behind a sign-in. This opens it, and the shape of the opening is
-- taken from what we actually want to ask people to sign in FOR:
--
--   anonymous share  -> works at once, expires after 30 days
--   signed-in share  -> kept indefinitely, listed, deletable by its owner
--
-- So "sign in to keep this" is a true statement about what signing in buys,
-- rather than a toll on the way to the feature.
--
-- Three changes, and one thing deliberately NOT changed:
--
--   user_id becomes nullable       — an anonymous share has no owner.
--   creator_ip_hash is added       — a salted hash, never an address, so the
--                                    server can rate-limit anonymous shares.
--   expires_at is added           — null means never.
--
--   NO insert policy for `anon`.   Anonymous shares are written by the server
--                                  with the service role, which is what makes
--                                  rate limiting possible at all. A policy
--                                  letting the public key insert directly
--                                  would be an unmetered write to a table
--                                  whose rows run to 400kB.

begin;

create temp table mig_log (n int, step text, detail text) on commit drop;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shared_rehearsals'
      and column_name = 'user_id' and is_nullable = 'NO'
  ) then
    alter table public.shared_rehearsals alter column user_id drop not null;
    insert into mig_log values (1, 'user_id', 'now nullable — anonymous shares have no owner');
  else
    insert into mig_log values (1, 'user_id', 'already nullable');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shared_rehearsals' and column_name = 'creator_ip_hash'
  ) then
    alter table public.shared_rehearsals add column creator_ip_hash text;
    insert into mig_log values (2, 'creator_ip_hash', 'added (a salted hash, never an address)');
  else
    insert into mig_log values (2, 'creator_ip_hash', 'already present');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shared_rehearsals' and column_name = 'expires_at'
  ) then
    alter table public.shared_rehearsals add column expires_at timestamptz;
    insert into mig_log values (3, 'expires_at', 'added (null = never)');
  else
    insert into mig_log values (3, 'expires_at', 'already present');
  end if;
end $$;

-- Counting one IP's shares for the day is the rate limit, so it needs to be
-- cheap. Partial, because signed-in shares are not rate limited.
create index if not exists shared_rehearsals_ip_created
  on public.shared_rehearsals (creator_ip_hash, created_at desc)
  where creator_ip_hash is not null;
insert into mig_log values (4, 'index (creator_ip_hash, created_at)', 'present');

create index if not exists shared_rehearsals_expires
  on public.shared_rehearsals (expires_at)
  where expires_at is not null;
insert into mig_log values (5, 'index (expires_at)', 'present');

/*
  The public read, updated: an expired share is gone as far as anyone opening
  a link is concerned. Still security definer, still keyed on the id, still
  returning only the title and the scene — never the owner.
*/
create or replace function public.shared_rehearsal(share_id uuid)
returns table (title text, data jsonb)
language sql
security definer
stable
set search_path = public
as $$
  select s.title, s.data
  from public.shared_rehearsals s
  where s.id = share_id
    and (s.expires_at is null or s.expires_at > now())
$$;
revoke all on function public.shared_rehearsal(uuid) from public;
grant execute on function public.shared_rehearsal(uuid) to anon, authenticated;
insert into mig_log values (6, 'shared_rehearsal(share_id)', 'rewritten to hide expired shares');

/*
  The owner policies still key on auth.uid() = user_id. With user_id nullable,
  auth.uid() = null is null rather than true, so an anonymous share matches
  nobody's policy and is invisible to every creator — which is correct: it
  belongs to no account and is reachable only by its link.
*/
insert into mig_log values (7, 'owner policies', 'unchanged — a null owner matches nobody');

insert into mig_log
select 8, 'shares now', count(*) || ' total, '
  || count(*) filter (where user_id is null) || ' anonymous, '
  || count(*) filter (where expires_at is not null and expires_at <= now()) || ' expired'
from public.shared_rehearsals;

select n as "#", step, detail from mig_log order by n;

commit;
