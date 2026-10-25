-- Memory Cinema — a film of a day you actually had.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- A day is a draft until somebody films it. That is the whole design, and it
-- follows from one decision: nothing here spends credits unattended and
-- nothing renders a day the person did not choose to render. A job that
-- filmed every day overnight would eventually film the worst day of
-- somebody's year while they slept, and no amount of charm survives that.
--
-- THE PEOPLE RULE. The brief wanted recurring people to stay cast correctly
-- over months. The product's own rule, written in capitals in the crew
-- migration, is that NOBODY IS EVER CAST FROM A PHOTO SOMEBODY ELSE
-- UPLOADED OF THEM. Those cannot both hold, and the consent rule wins. So a
-- person appears in your film only if they built their own character and
-- granted you a standing pass to use it. Everybody else is in the story and
-- not on the screen: the scene can say two friends were there without
-- rendering two faces. memory_grants is that pass, and it is revocable.
--
-- WHAT THE PHOTOS ARE FOR. Setting, not casting. They are read for where you
-- were, what time it was, what the weather did and what was happening, and
-- the prompt that reads them is told not to describe anybody identifiably.
-- A face in your camera roll is not a casting decision.

create table if not exists public.memory_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  -- The one line the person writes. It carries the whole meaning: a photo of
  -- a parking lot cannot tell anybody the day was a disaster.
  note        text,
  -- [{ url, read: { setting, timeOfDay, weather, activity } }]. The reads are
  -- kept so filming is a database read rather than a second vision pass over
  -- the same photos.
  photos      jsonb not null default '[]'::jsonb,
  style_id    text,
  -- Which character plays the person whose day it is.
  pack_id     uuid references public.vault_entries (id) on delete set null,
  -- Other people's packs, by id. Written freely and validated against live
  -- grants at film time, because a grant can be revoked between the two and
  -- the moment that matters is the moment the face is used.
  cast_packs  jsonb not null default '[]'::jsonb,
  status      text not null default 'draft',
  generation_id uuid references public.generations (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- One row per person per day. Not a partial index: ON CONFLICT cannot
  -- infer one, which is how the animated-sets upsert broke.
  constraint memory_days_one_per_day unique (user_id, day),
  constraint memory_days_status check (status in ('draft', 'filming', 'filmed'))
);

alter table public.memory_days enable row level security;

drop policy if exists "people read their own days" on public.memory_days;
create policy "people read their own days"
  on public.memory_days for select to authenticated using (auth.uid() = user_id);

drop policy if exists "people write their own days" on public.memory_days;
create policy "people write their own days"
  on public.memory_days for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "people edit their own days" on public.memory_days;
create policy "people edit their own days"
  on public.memory_days for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "people delete their own days" on public.memory_days;
create policy "people delete their own days"
  on public.memory_days for delete to authenticated using (auth.uid() = user_id);

create index if not exists memory_days_user_idx
  on public.memory_days (user_id, day desc);

-- A standing pass: one person letting another cast their character in that
-- other person's life films.
--
-- The direction matters and is easy to get backwards. I want my sister in my
-- films, so SHE has to grant it. The request is created by the person who
-- wants it (granted_to) and is empty until she accepts with a character of
-- her own, which is the only moment a pack id can be attached. A link, not a
-- directory: nothing here looks a user up by email, because a product that
-- can find somebody by email address is a product that leaks who is on it.
create table if not exists public.memory_grants (
  id          uuid primary key default gen_random_uuid(),
  -- Who asked, and who may use it. Set at creation.
  granted_to  uuid not null references auth.users (id) on delete cascade,
  -- Who granted it, and with which character. Null until accepted.
  granted_by  uuid references auth.users (id) on delete cascade,
  pack_id     uuid references public.vault_entries (id) on delete cascade,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at  timestamptz not null default now() + interval '14 days',
  constraint memory_grants_status check (status in ('pending', 'live', 'revoked')),
  -- Accepting twice with the same character is one grant, not two.
  constraint memory_grants_once unique (granted_to, pack_id),
  -- A live grant without a character or a grantor is a pass to nothing, and
  -- would read as permission at film time. Refuse it here rather than hoping
  -- the endpoint is careful.
  constraint memory_grants_live_is_complete
    check (status <> 'live' or (granted_by is not null and pack_id is not null))
);

alter table public.memory_grants enable row level security;

-- Both sides can see a grant: the person who asked, and the person who gave
-- it. Revoking is the grantor's, and only theirs.
drop policy if exists "both sides read a grant" on public.memory_grants;
create policy "both sides read a grant"
  on public.memory_grants for select to authenticated
  using (auth.uid() = granted_to or auth.uid() = granted_by);

drop policy if exists "grantors revoke their own" on public.memory_grants;
create policy "grantors revoke their own"
  on public.memory_grants for update to authenticated
  using (auth.uid() = granted_by) with check (auth.uid() = granted_by);

create index if not exists memory_grants_to_idx
  on public.memory_grants (granted_to, status);
create index if not exists memory_grants_by_idx
  on public.memory_grants (granted_by, status);

-- The thin public read for a request link: who is asking, and nothing else.
create or replace function public.memory_grant_view(p_grant uuid)
returns table (asker_name text, status text, expired boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce(
      (select v.name from public.vault_entries v
         where v.user_id = g.granted_to and v.kind = 'character'
         order by v.created_at limit 1),
      'Someone'
    ) as asker_name,
    g.status,
    (g.expires_at < now()) as expired
  from public.memory_grants g
  where g.id = p_grant
$$;

revoke all on function public.memory_grant_view(uuid) from public;
grant execute on function public.memory_grant_view(uuid) to anon, authenticated;

-- Which packs a person may actually cast in their own films, right now.
-- Server-side only: it returns other people's character rows, and the whole
-- point is that a client never holds those.
create or replace function public.castable_for(p_user uuid)
returns table (pack_id uuid, name text, description text, build text,
               distinguishing text, wardrobe text, images jsonb)
language sql
security definer
stable
set search_path = public
as $$
  select v.id, v.name, v.description, v.build, v.distinguishing, v.wardrobe, v.images
  from public.memory_grants g
  join public.vault_entries v on v.id = g.pack_id
  where g.granted_to = p_user
    and g.status = 'live'
    and g.expires_at > now()
$$;

revoke all on function public.castable_for(uuid) from public;
grant execute on function public.castable_for(uuid) to service_role;

-- The same list, names only, for the signed-in person's own interface: they
-- have to be able to tick "my sister is in this day", which means seeing her
-- character's name. It takes no argument and reads auth.uid() itself, so it
-- cannot be asked about anybody else, and it returns a name the caller was
-- already given along with the pass — never a description, never an image.
create or replace function public.castable_names()
returns table (pack_id uuid, name text)
language sql
security definer
stable
set search_path = public
as $$
  select v.id, v.name
  from public.memory_grants g
  join public.vault_entries v on v.id = g.pack_id
  where g.granted_to = auth.uid()
    and g.status = 'live'
    and g.expires_at > now()
$$;

revoke all on function public.castable_names() from public;
grant execute on function public.castable_names() to authenticated;

-- Verify:
--   select count(*) from public.memory_days;                  -- 0, no error
--   select * from public.memory_grant_view(gen_random_uuid()); -- 0 rows, no error
--
-- Signed out, in a browser console, both must come back empty:
--   await supabase.from('memory_days').select('id')
--   await supabase.from('memory_grants').select('id')
