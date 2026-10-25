-- Character packs — the locked identity, and where it lives before there is
-- an account to put it in.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- Two parts.
--
-- 1. vault_entries gains three columns. A pack IS a vault entry — the Vault
--    already holds name, description, wardrobe, distinguishing, images and a
--    voice, which is most of a pack — so this adds only what is missing
--    rather than inventing a second identity table that would immediately
--    drift from the first.
--
--    `locked` is deliberately NOT a column. Which fields are locked is the
--    same for every pack in the product, so it is a constant in code, not
--    data. A per-row `locked` list is a per-row way to unlock somebody's
--    face.
--
-- 2. pending_packs holds a pack built before sign-up.
--
--    The product's hook is that a stranger takes a selfie and sees themselves
--    in a scene with no account at all. That means a pack exists before a
--    user does, and vault_entries requires a user_id. So an anonymous pack
--    waits here under a random token, and is claimed into the Vault the
--    moment somebody signs up — which is what "sign up to keep your pack"
--    actually does.
--
--    The token is the only credential, so this table has NO policies at all:
--    neither anon nor authenticated can read, write or list it. Every access
--    goes through the server with the service role. A client that could read
--    this table could read strangers' faces.

-- ---- 1. the pack's own fields -------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'vault_entries' and column_name = 'build') then
    alter table public.vault_entries add column build text;
    raise notice 'vault_entries.build: added';
  else
    raise notice 'vault_entries.build: already present';
  end if;

  -- How the pack was captured: booth or phone, which plate set, when.
  -- Decides studio grade, and what a later re-render can improve.
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'vault_entries' and column_name = 'capture') then
    alter table public.vault_entries add column capture jsonb;
    raise notice 'vault_entries.capture: added';
  else
    raise notice 'vault_entries.capture: already present';
  end if;

  -- What this person agreed to. Separate from the row existing, because
  -- being in the Vault is not consent to be cast in somebody else's duet.
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'vault_entries' and column_name = 'consent') then
    alter table public.vault_entries add column consent jsonb;
    raise notice 'vault_entries.consent: added';
  else
    raise notice 'vault_entries.consent: already present';
  end if;
end $$;

-- ---- 2. packs made before there is an account ---------------------------
create table if not exists public.pending_packs (
  token       uuid primary key default gen_random_uuid(),
  pack        jsonb not null,
  -- A salted hash, never an address, and never returned to anybody. Only
  -- compared against other hashes made the same way.
  ip_hash     text,
  claimed_by  uuid references auth.users (id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now(),
  -- An unclaimed pack is somebody's face sitting in a database with no owner
  -- and nobody to ask for its deletion. It expires on its own.
  expires_at  timestamptz not null default now() + interval '7 days'
);

alter table public.pending_packs
  drop constraint if exists pending_packs_size;
alter table public.pending_packs
  add constraint pending_packs_size check (pg_column_size(pack) < 20000);

alter table public.pending_packs enable row level security;

-- No policies on purpose. See the note above. Service role only.

create index if not exists pending_packs_expiry on public.pending_packs (expires_at);
create index if not exists pending_packs_ip on public.pending_packs (ip_hash, created_at desc);

-- Sweeping expired packs. Called by the server; also safe to run by hand.
create or replace function public.sweep_pending_packs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  gone integer;
begin
  delete from public.pending_packs
   where expires_at < now() and claimed_at is null;
  get diagnostics gone = row_count;
  return gone;
end
$$;

revoke all on function public.sweep_pending_packs() from public;

-- Verify, after running the above:
--
--   select column_name from information_schema.columns
--    where table_name = 'vault_entries' and column_name in ('build','capture','consent');
--     -- three rows
--
--   select count(*) from public.pending_packs;   -- 0, and no error
--   select public.sweep_pending_packs();         -- 0
--
-- And from a signed-out browser console on the site, this must come back
-- empty rather than as a list:
--
--   await supabase.from('pending_packs').select('token')
