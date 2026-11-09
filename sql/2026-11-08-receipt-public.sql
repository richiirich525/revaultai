-- Published production receipts — let a stranger read one.
--
-- Run this in the Supabase SQL editor. It reports what it did and is safe to
-- run twice.
--
-- A receipt is the one artifact on this site that a filmmaker would rather
-- show another filmmaker than show off: the models, the attempts, what was
-- rejected and why, in the creator's own words. FilmReceipt.jsx has rendered
-- a public view of one since the day it shipped, reading film_receipts
-- straight from the browser. If no policy lets that read through, the query
-- comes back empty for everyone except the owner, the component returns null,
-- and the feature is invisible without ever erroring. This opens exactly the
-- rows a creator has chosen to publish, and nothing else.
--
-- Four changes, and two things deliberately NOT changed:
--
--   published column     — ensured to exist, default false. The component
--                          gates its whole public view on it and
--                          build-receipt.js never writes it, so a receipt
--                          is born private and stays private until its
--                          owner presses Publish.
--
--   row-level security   — ensured enabled. A policy on a table with RLS
--                          off is decoration: Postgres never consults it.
--
--   select policy        — anon and authenticated may read a row WHERE
--                          published is true. That is the entire opening.
--
--   owner policy         — ensured to exist, so a creator can still read
--                          their own unpublished receipt and edit it.
--                          Permissive policies are ORed, so the two sit
--                          side by side without either weakening the other.
--
--   NO insert policy for anon.      Receipts are built by the server through
--                                   api/build-receipt.js, which checks that
--                                   the film belongs to the caller.
--
--   NO update policy for anon.      Visibility, rights and the director's
--                                   notes are the owner's alone to set.
--
-- An unpublished receipt carries credit spend and attempt counts a creator
-- has not agreed to show, so the published test is the whole security
-- boundary here and is written into the policy rather than the client.
--
-- Verified against PostgreSQL 16 on a fixture with three receipts across two
-- creators: anonymous reads see only the published one, a signed-in stranger
-- sees the published one plus their own, the owner sees both of theirs and
-- none of anyone else's, unpublishing hides it again, and a second run of
-- this file changes nothing. The check was then mutated — the policy
-- rewritten as using(true) — and anonymous reads jumped to all three rows,
-- which is how we know the test discriminates rather than passing vacuously.

begin;

create temp table mig_log (n int, step text, detail text) on commit drop;

-- 1. The column the public view is gated on.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'film_receipts'
      and column_name = 'published'
  ) then
    alter table public.film_receipts add column published boolean not null default false;
    insert into mig_log values (1, 'published column', 'added, default false');
  else
    insert into mig_log values (1, 'published column', 'already present');
  end if;
end $$;

-- 2. Row-level security on at all.
do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'film_receipts' and c.relrowsecurity
  ) then
    insert into mig_log values (2, 'row-level security', 'already enabled');
  else
    alter table public.film_receipts enable row level security;
    insert into mig_log values (2, 'row-level security', 'enabled');
  end if;
end $$;

-- 3. The opening itself.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'film_receipts'
      and policyname = 'film_receipts_published_readable'
  ) then
    insert into mig_log values (3, 'public read', 'policy already present');
  else
    create policy film_receipts_published_readable
      on public.film_receipts
      for select
      to anon, authenticated
      using (published is true);
    insert into mig_log values (3, 'public read', 'published receipts are now readable by anyone');
  end if;
end $$;

-- 4. The owner keeps full read of their own, published or not.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'film_receipts'
      and cmd = 'SELECT' and policyname <> 'film_receipts_published_readable'
  ) then
    insert into mig_log values (4, 'owner read', 'an owner select policy already exists — left alone');
  else
    create policy film_receipts_owner_readable
      on public.film_receipts
      for select
      to authenticated
      using (auth.uid() = user_id);
    insert into mig_log values (4, 'owner read', 'added — a creator can read their own unpublished receipt');
  end if;
end $$;

-- 5. What the table now allows, so the report shows the whole picture rather
--    than only the lines this file wrote.
insert into mig_log
select 5, 'policy: ' || policyname, lower(cmd) || ' to ' || array_to_string(roles, ', ')
from pg_policies
where schemaname = 'public' and tablename = 'film_receipts';

select n, step, detail from mig_log order by n, step;

commit;
