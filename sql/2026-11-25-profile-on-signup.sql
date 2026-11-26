-- A profile for every account, created by the database rather than the browser.
--
-- Run this in the Supabase SQL editor. It reports what it did and is safe to
-- run twice.
--
-- Today a profile row appears only if a signed-in person loads the React app
-- and an upsert from loadOrCreateProfile succeeds. Nothing creates one at
-- sign-up. The result, measured on 2026-11-25: of 129 accounts, 27 had no
-- profile at all. Fifteen of those had confirmed their email, so they came
-- back, the app ran, and the row still never appeared. That is a failure, not
-- attrition.
--
-- A missing profile is not cosmetic. profiles.credits is where a balance
-- lives, so an account with no row cannot hold credits, cannot be granted
-- any, does not appear in the admin list, and is invisible to any mailing
-- built from profiles. Twenty-one percent of the user base was in that state.
--
-- Three changes:
--
--   trigger     After a row appears in auth.users, a profile is created for
--               it. Server side, so it no longer depends on a browser ever
--               running, or on the person ever returning.
--
--   backfill    A profile for every existing account that lacks one.
--
--   grant       The welcome balance for profiles still holding zero. The
--               credits column gained a default of 25 after all 102 existing
--               profiles were created, so every one of them predates it and
--               holds nothing. Verified: inserting a profile without a
--               credits key now yields 25.
--
-- The amount is NOT written in this file. It is read from the column default,
-- so there is one source of truth and changing the default changes this too.
-- Nothing here grants credits to somebody who spent theirs: a profile is only
-- topped up if it has no generations at all.

begin;

create temp table mig_log (n int, step text, detail text) on commit drop;

-- 1. The function. security definer because the caller inserting into
--    auth.users is not the owner of public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base   text;
  handle text;
begin
  -- Mirrors defaultProfile() in src/lib/profiles.js: the part of the email
  -- before the @, falling back to 'creator'.
  base := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  if base is null then
    base := 'creator';
  end if;

  -- username is NOT NULL and two people can share an email local part, so a
  -- collision gets a suffix rather than failing.
  handle := base;
  if exists (select 1 from public.profiles p where p.username = handle) then
    handle := base || '-' || substr(new.id::text, 1, 6);
  end if;

  -- credits is deliberately absent: the column default is the one source of
  -- truth for the welcome balance.
  insert into public.profiles (id, username, display_name)
  values (new.id, handle, base)
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- A profile that fails to appear is a problem. A sign-up that fails
    -- because of it is a worse one, so this never aborts the insert into
    -- auth.users; it complains into the Postgres log and lets the account
    -- through. The backfill below catches anything this misses.
    raise warning 'handle_new_user could not create a profile for %: %', new.id, sqlerrm;
    return new;
end $$;

insert into mig_log values (1, 'trigger function', 'public.handle_new_user() created or replaced');

-- 2. The trigger itself.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into mig_log values (2, 'trigger', 'on_auth_user_created now fires after every new account');

-- 3. Backfill the accounts that never got a profile.
with missing as (
  select u.id,
         coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'creator') as base
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
), named as (
  -- Same collision rule as the trigger, and a second guard against two
  -- backfilled rows claiming the same handle in one statement.
  select id,
         base,
         case
           when exists (select 1 from public.profiles p where p.username = m.base)
             or row_number() over (partition by base order by id) > 1
           then base || '-' || substr(id::text, 1, 6)
           else base
         end as handle
  from missing m
)
insert into public.profiles (id, username, display_name)
select id, handle, base from named
on conflict (id) do nothing;

insert into mig_log
select 3, 'backfill', 'profiles created for accounts that had none: ' ||
  (select count(*) from auth.users u left join public.profiles p on p.id = u.id where p.id is null)::text
  || ' still missing';

-- 4. The welcome balance, for profiles that predate the column default.
do $$
declare
  welcome int;
  touched int;
begin
  -- Read the amount from the column itself rather than repeating it here.
  select coalesce(nullif(regexp_replace(column_default, '[^0-9]', '', 'g'), ''), '0')::int
    into welcome
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'credits';

  if welcome is null or welcome = 0 then
    insert into mig_log values (4, 'welcome grant', 'skipped: profiles.credits has no numeric default to grant');
  else
    update public.profiles p
       set credits = welcome
     where p.credits = 0
       and not exists (select 1 from public.generations g where g.user_id = p.id);
    get diagnostics touched = row_count;
    insert into mig_log values (4, 'welcome grant',
      touched::text || ' profiles topped up to ' || welcome::text ||
      ' (profiles that had spent credits were left alone)');
  end if;
end $$;

-- 5. Structural proof the trigger is actually installed and enabled. This
--    does not prove it fires correctly on a real sign-up; see the note at the
--    bottom for that. It does catch the case where the create silently did
--    not take.
do $$
declare
  state char;
begin
  select t.tgenabled into state
  from pg_trigger t
  where t.tgrelid = 'auth.users'::regclass and t.tgname = 'on_auth_user_created';

  if state is null then
    raise exception 'on_auth_user_created is not present on auth.users after creating it';
  elsif state = 'D' then
    raise exception 'on_auth_user_created exists but is disabled';
  end if;
  insert into mig_log values (5, 'verified', 'trigger is present on auth.users and enabled');
end $$;

-- 6. Where things stand now.
insert into mig_log
select 6, 'accounts', (select count(*) from auth.users)::text || ' accounts, '
  || (select count(*) from public.profiles)::text || ' profiles, '
  || (select count(*) from public.profiles where credits > 0)::text || ' holding credits';

select n, step, detail from mig_log order by n, step;

commit;

-- Verify for real, after this runs:
--
--   The structural check above proves the trigger exists. It does not prove
--   it works, and this file deliberately does not fake an auth.users insert
--   to pretend otherwise. Sign up a throwaway account, then:
--
--     select u.email, p.username, p.credits
--     from auth.users u left join public.profiles p on p.id = u.id
--     order by u.created_at desc limit 1;
--
--   A profile with a balance means it fired. No profile means it did not,
--   and the Postgres logs will carry the warning saying why.
