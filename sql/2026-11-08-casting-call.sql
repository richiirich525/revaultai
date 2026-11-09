-- Casting Call — a role anyone can audition for with their own face.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- The sibling of Cast Your Crew, and its opposite. A crew invite has two or
-- three seats and everyone who joins is in the film. A casting call takes
-- however many auditions arrive and the owner picks one, so MOST people who
-- turn up are not cast. That is the point rather than a flaw: the ones who
-- are not cast still leave holding a locked character pack of themselves,
-- waiting in pending_packs to be claimed on sign-up. They came for a role
-- and left with a character.
--
-- The same rule as crew shapes this: NOBODY IS EVER CAST FROM A PHOTO
-- SOMEBODY ELSE UPLOADED OF THEM. An auditioner builds their own pack from
-- their own selfie, and build-pack's three gates run before a pack exists.
--
-- CASTING DOES NOT SHOOT. When the owner picks someone, the server creates
-- an ordinary crew_invites row addressed to that pack, and the existing
-- mechanic takes over. That is not only code reuse. Auditioning for "Ruth,
-- 40s, tired" is not agreeing to appear in whatever gets made afterwards:
-- the crew invite shows the actual scene, and accepting it is the second,
-- specific consent. crew_invite_id below is where that invite is recorded.
--
-- Two tables for the same reason crew has two: an auditions list inside the
-- call's jsonb would be a read-modify-write, and two people submitting at
-- the same moment would lose one of them with no error anywhere.
--
-- Link-only, like a crew invite. There is no policy letting anyone list
-- open calls, because a public index of casting calls is a product decision
-- with its own moderation problem and is not needed to find out whether
-- anybody auditions at all.
--
-- Verified against PostgreSQL 16 on a fixture mirroring Supabase's default
-- grants, which matter here: anon and authenticated DO hold select on these
-- tables in production, so row-level security is the only thing protecting
-- them. Eight behaviors checked — the public view returns the role, the
-- caster and a count and nothing identifying; anonymous reads see zero calls
-- and zero auditions; a rival creator sees zero of someone else's; the owner
-- sees their own; a double-tapped audition is refused; a second person
-- cannot be cast; a row cannot carry both a pack and a token; and the cap
-- flips the view to 'full'. A second run changes nothing and loses no rows.
-- The suite was then mutated — a permissive policy added to
-- casting_auditions — and anonymous reads jumped to every row, which is how
-- we know it discriminates rather than passing vacuously.

create table if not exists public.casting_calls (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  -- What an auditioner reads. The name is what appears on the role; the
  -- brief is the casting director's line about who this person is.
  role_name     text not null,
  role_brief    text not null,
  -- Optional. A call can hang off a planned shot, or stand alone.
  film_spec_id  uuid references public.film_specs (id) on delete set null,
  -- A public URL that spends a vision call per submission needs a ceiling
  -- of its own. build-pack already caps anonymous packs per IP per day;
  -- this caps one link however many addresses it is opened from.
  max_auditions integer not null default 50,
  status        text not null default 'open',
  -- The crew invite created when somebody is cast, so the two halves of the
  -- consent can be read as one chain afterwards.
  crew_invite_id uuid references public.crew_invites (id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '14 days',
  constraint casting_calls_cap check (max_auditions between 1 and 500),
  constraint casting_calls_status check (status in ('open', 'cast', 'closed', 'canceled'))
);

alter table public.casting_calls enable row level security;

drop policy if exists "owners read their own calls" on public.casting_calls;
create policy "owners read their own calls"
  on public.casting_calls for select to authenticated using (auth.uid() = owner_id);

drop policy if exists "owners update their own calls" on public.casting_calls;
create policy "owners update their own calls"
  on public.casting_calls for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- No insert policy: calls are created by the server, which is also where the
-- cap and the role-text moderation live.

create index if not exists casting_calls_owner on public.casting_calls (owner_id, created_at desc);


create table if not exists public.casting_auditions (
  id            bigint generated always as identity primary key,
  call_id       uuid not null references public.casting_calls (id) on delete cascade,
  -- An auditioner's pack, wherever it lives. One of these is set, never both.
  pack_id       uuid references public.vault_entries (id) on delete cascade,
  pending_token uuid references public.pending_packs (token) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  -- Denormalized so the owner can review auditions without being able to
  -- read strangers' Vault rows.
  display_name  text,
  status        text not null default 'submitted',
  created_at    timestamptz not null default now(),
  constraint casting_auditions_one_pack check (num_nonnulls(pack_id, pending_token) = 1),
  constraint casting_auditions_status check (status in ('submitted', 'cast', 'passed'))
);

alter table public.casting_auditions enable row level security;

-- No policies at all, exactly as crew_members has none. A client that could
-- list this table could see which strangers auditioned for what. The owner
-- reads their auditions through the server, which checks ownership first.

-- One audition per person per call, so a double tap does not submit twice.
create unique index if not exists casting_auditions_one_per_pack
  on public.casting_auditions (call_id, pack_id) where pack_id is not null;
create unique index if not exists casting_auditions_one_per_token
  on public.casting_auditions (call_id, pending_token) where pending_token is not null;
create index if not exists casting_auditions_call on public.casting_auditions (call_id, created_at desc);
-- At most one person is cast from a call.
create unique index if not exists casting_auditions_one_cast
  on public.casting_auditions (call_id) where status = 'cast';


-- What somebody holding the link may see: the role, who is casting it, and
-- how many have auditioned. Never the auditioners, never their packs, never
-- the owner's email. security definer because an auditioner has no account.
create or replace function public.casting_call_view(p_call uuid)
returns table (
  role_name text, role_brief text, caster_name text,
  submissions integer, max_auditions integer, status text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.role_name,
    c.role_brief,
    coalesce(p.display_name, p.username, 'A RevaultAI creator') as caster_name,
    (select count(*)::integer from public.casting_auditions a where a.call_id = c.id) as submissions,
    c.max_auditions,
    case
      when c.expires_at < now() and c.status = 'open' then 'expired'
      when c.status = 'open'
       and (select count(*) from public.casting_auditions a where a.call_id = c.id) >= c.max_auditions
       then 'full'
      else c.status
    end as status
  from public.casting_calls c
  left join public.profiles p on p.id = c.owner_id
  where c.id = p_call
$$;

revoke all on function public.casting_call_view(uuid) from public;
grant execute on function public.casting_call_view(uuid) to anon, authenticated;

-- Verify:
--   select count(*) from public.casting_calls;                  -- 0, no error
--   select * from public.casting_call_view(gen_random_uuid());  -- 0 rows, no error
--
-- Signed out, in a browser console, both must come back empty:
--   await supabase.from('casting_calls').select('id')
--   await supabase.from('casting_auditions').select('id')
