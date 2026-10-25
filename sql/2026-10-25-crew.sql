-- Cast Your Crew — a scene that needs more than one person in it.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- With no feed, invites are the only way a new person arrives, so this is
-- the growth engine rather than a social feature. The shape follows from one
-- rule in the product: NOBODY IS EVER CAST FROM A PHOTO SOMEBODY ELSE
-- UPLOADED OF THEM. A guest builds their own pack from their own selfie.
-- That is the only defensible consent model, and it happens to mean every
-- invite creates a new pack holder.
--
-- Two tables, for the reason world_beats is its own table: a members list
-- inside the invite's jsonb would be a read-modify-write, and two friends
-- accepting at the same moment would lose one of them with no error
-- anywhere. One row per member has no such race, and the seat count is then
-- a count rather than arithmetic.

create table if not exists public.crew_invites (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references auth.users (id) on delete cascade,
  -- The host's own pack. They are in the scene too; a crew of guests with
  -- no host is not what anybody asked for.
  host_pack   uuid not null references public.vault_entries (id) on delete cascade,
  style_id    text not null,
  beat_id     text not null,
  -- Including the host. 2 or 3 — four in one frame fails reliably, and the
  -- compiler refuses it, so the invite must not be able to ask for it.
  seats       integer not null default 2,
  status      text not null default 'open',
  generation_id uuid references public.generations (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  constraint crew_invites_seats check (seats between 2 and 3),
  constraint crew_invites_status check (status in ('open', 'full', 'shot', 'canceled'))
);

alter table public.crew_invites enable row level security;

drop policy if exists "hosts read their own invites" on public.crew_invites;
create policy "hosts read their own invites"
  on public.crew_invites for select to authenticated using (auth.uid() = host_id);

drop policy if exists "hosts cancel their own invites" on public.crew_invites;
create policy "hosts cancel their own invites"
  on public.crew_invites for update to authenticated
  using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- No insert policy: invites are created by the server, which checks that the
-- host actually owns the pack they are casting.

create index if not exists crew_invites_host on public.crew_invites (host_id, created_at desc);


create table if not exists public.crew_members (
  id          bigint generated always as identity primary key,
  invite_id   uuid not null references public.crew_invites (id) on delete cascade,
  -- A guest's pack, wherever it lives. One of these is set, never both.
  pack_id     uuid references public.vault_entries (id) on delete cascade,
  pending_token uuid references public.pending_packs (token) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  -- Denormalized so the host can see who has joined without being able to
  -- read strangers' Vault rows. A first name is what an invite shows.
  display_name text,
  joined_at   timestamptz not null default now(),
  constraint crew_members_one_pack check (num_nonnulls(pack_id, pending_token) = 1)
);

alter table public.crew_members enable row level security;

-- No policies at all. Membership is read through the function below, which
-- takes an invite id: a client that could list this table could see which
-- strangers are in which scenes.

-- One seat per person per invite, so a double-tap does not take two.
create unique index if not exists crew_members_one_per_pack
  on public.crew_members (invite_id, pack_id) where pack_id is not null;
create unique index if not exists crew_members_one_per_token
  on public.crew_members (invite_id, pending_token) where pending_token is not null;
create index if not exists crew_members_invite on public.crew_members (invite_id);


-- What a guest holding the link may see: who invited them, what the scene is,
-- and how many seats are left. Never the host's email, never the other
-- guests' packs. security definer because a guest has no account yet.
create or replace function public.crew_invite_view(p_invite uuid)
returns table (host_name text, style_id text, beat_id text, seats integer, taken integer, status text)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce(v.name, 'Someone') as host_name,
    i.style_id,
    i.beat_id,
    i.seats,
    (select count(*)::integer from public.crew_members m where m.invite_id = i.id) + 1 as taken,
    case when i.expires_at < now() and i.status = 'open' then 'expired' else i.status end as status
  from public.crew_invites i
  left join public.vault_entries v on v.id = i.host_pack
  where i.id = p_invite
$$;

revoke all on function public.crew_invite_view(uuid) from public;
grant execute on function public.crew_invite_view(uuid) to anon, authenticated;

-- Verify:
--   select count(*) from public.crew_invites;                 -- 0, no error
--   select * from public.crew_invite_view(gen_random_uuid()); -- 0 rows, no error
--
-- Signed out, in a browser console, both must come back empty:
--   await supabase.from('crew_invites').select('id')
--   await supabase.from('crew_members').select('id')
