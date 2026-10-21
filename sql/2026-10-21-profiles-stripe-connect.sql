-- profiles: the Stripe Connect columns the payout flow needs.
--
-- These were declared in the v28 notes and never run. The consequence is not
-- cosmetic: api/connect-onboard.js creates the account at Stripe FIRST and
-- then records its id here. With the column absent, the write fails and the
-- route returns 500 — so every creator who has pressed "set up payouts" has
-- an account sitting at Stripe that this database has no record of. See the
-- note at the bottom about finding them.
--
-- Safe to run twice: every statement is if-not-exists or drop-then-create.

alter table public.profiles
  add column if not exists stripe_account_id text,
  -- Set from a validated two-letter ISO code in connect-onboard.js.
  add column if not exists stripe_country text,
  -- Synced from Stripe by connect-status.js. The code reads both as !!value,
  -- so false is the honest default for every existing row: nobody is
  -- onboarded until Stripe says so.
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_details_submitted boolean not null default false;

-- One Stripe account per profile. connect-onboard.js refuses to continue when
-- it cannot record an id, precisely so a second account is never created for
-- the same creator — this makes that guarantee the database's rather than the
-- route's. Nullable columns allow many NULLs in a unique index, so profiles
-- without an account are unaffected.
create unique index if not exists profiles_stripe_account_id_key
  on public.profiles (stripe_account_id)
  where stripe_account_id is not null;

-- Match the validation the route already does, so a bad value cannot arrive
-- by another path.
alter table public.profiles
  drop constraint if exists profiles_stripe_country_iso;
alter table public.profiles
  add constraint profiles_stripe_country_iso
  check (stripe_country is null or stripe_country ~ '^[A-Z]{2}$');

-- Verify:
--
--   select column_name, data_type, column_default, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles'
--     and column_name like 'stripe_%'
--   order by column_name;
--
-- Expect four rows: stripe_account_id (text), stripe_country (text),
-- stripe_details_submitted (boolean, default false), stripe_payouts_enabled
-- (boolean, default false).
--
-- Then re-run sql/check-schema.sql — all four should say ok.
--
-- ORPHANED STRIPE ACCOUNTS
-- Any creator who tried to connect before this ran has an account at Stripe
-- that is not recorded here. In the Stripe dashboard, under Connect →
-- Accounts, each one carries metadata.revaultai_user_id. To reconcile one:
--
--   update public.profiles
--      set stripe_account_id = 'acct_XXXX', stripe_country = 'US'
--    where id = '<the revaultai_user_id from the account metadata>';
--
-- Do that before the creator tries again, or they will get a second account.
