-- World capsules — a take, locked into a place somebody can walk into.
--
-- Run this in the Supabase SQL editor. Locking a world fails with a clear
-- message until it exists, so nothing breaks in the meantime.
--
-- Two tables, and the split is the important part:
--
--   world_capsules  the world as derived from a take. Re-lockable: observe a
--                   take after the fact and the capsule gets better, so
--                   locking the same take twice must update one row rather
--                   than make a second world with the same contents.
--
--   world_beats     what has happened in the world since. Append-only, one
--                   row per beat.
--
-- Keeping memory out of the capsule is not tidiness. If beats lived in the
-- capsule's jsonb, then re-locking would overwrite the room's memory — and
-- two people adding a beat at the same moment would each read the array,
-- append to their copy and write it back, so one of the two beats would
-- vanish with no error anywhere. A row per beat has neither problem.
--
-- Like a shared rehearsal, a capsule is meant to be reachable by its link and
-- NOT otherwise. A blanket "select using (true)" would let anyone holding the
-- public anon key list every world anyone had ever locked. So neither table
-- has a select policy, and reading goes through a security-definer function
-- that requires the id. No id, no row, no enumeration.

create table if not exists public.world_capsules (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  generation_id  uuid references public.generations (id) on delete set null,
  title          text not null default 'Untitled world',
  capsule        jsonb not null,
  -- What extraction could not find, kept so the first gate is measurable:
  -- "do most takes build a world worth entering" is only answerable if the
  -- answer was recorded at the time rather than re-derived later against
  -- whatever the extractor does by then.
  usable         boolean not null default false,
  gaps           jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One capsule per take per creator, so re-locking a take updates the world it
-- made rather than standing up a second one with the same contents.
--
-- A plain constraint rather than a partial index, and the difference matters
-- twice over. Nulls are distinct in a unique index, so this already allows
-- any number of worlds whose takes have since been deleted — which is the
-- behavior wanted, because two worlds whose takes are both gone are not the
-- same world. And ON CONFLICT cannot infer a partial index unless the query
-- repeats its predicate, which the client library does not do: with a
-- partial index here, the first re-lock anybody attempted would have failed
-- with "no unique or exclusion constraint matching the ON CONFLICT
-- specification".
alter table public.world_capsules
  drop constraint if exists world_capsules_one_per_take;
alter table public.world_capsules
  add constraint world_capsules_one_per_take unique (user_id, generation_id);

-- A capsule is a cast list, a set, a state paragraph and some URLs. The
-- extractor caps every field, so this ceiling is generous for a correct
-- capsule and still stops a row being used as free storage. Enforced here
-- rather than in the client, because the client is the part an attacker
-- controls.
alter table public.world_capsules
  drop constraint if exists world_capsules_size;
alter table public.world_capsules
  add constraint world_capsules_size check (pg_column_size(capsule) < 200000);

alter table public.world_capsules enable row level security;

-- No select policy on purpose. See the note above.

drop policy if exists "creators insert their own worlds" on public.world_capsules;
create policy "creators insert their own worlds"
  on public.world_capsules
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "creators read their own worlds" on public.world_capsules;
create policy "creators read their own worlds"
  on public.world_capsules
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "creators update their own worlds" on public.world_capsules;
create policy "creators update their own worlds"
  on public.world_capsules
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "creators delete their own worlds" on public.world_capsules;
create policy "creators delete their own worlds"
  on public.world_capsules
  for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists world_capsules_user_created
  on public.world_capsules (user_id, created_at desc);


-- The memory. Append-only by construction: there is no update policy and no
-- delete policy for anyone but the owner, so a beat written into a room
-- cannot be quietly edited afterwards by whoever is in it.
create table if not exists public.world_beats (
  id          bigint generated always as identity primary key,
  capsule_id  uuid not null references public.world_capsules (id) on delete cascade,
  -- Who added it. Null for a beat added by somebody with the link who is not
  -- signed in, which is allowed in a shared room and must not be mistaken for
  -- a beat the owner wrote.
  author_id   uuid references auth.users (id) on delete set null,
  kind        text not null default 'beat',
  text        text not null,
  created_at  timestamptz not null default now(),
  constraint world_beats_text_length check (char_length(text) between 1 and 1200),
  constraint world_beats_kind_known check (kind in ('origin', 'beat', 'said', 'arrived'))
);

alter table public.world_beats enable row level security;

-- No select policy: beats come back with the capsule, through the function
-- below, which needs the capsule's id.

drop policy if exists "owners add beats to their own worlds" on public.world_beats;
create policy "owners add beats to their own worlds"
  on public.world_beats
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.world_capsules c
      where c.id = capsule_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "owners read beats in their own worlds" on public.world_beats;
create policy "owners read beats in their own worlds"
  on public.world_beats
  for select
  to authenticated
  using (
    exists (
      select 1 from public.world_capsules c
      where c.id = capsule_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "owners delete beats in their own worlds" on public.world_beats;
create policy "owners delete beats in their own worlds"
  on public.world_beats
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.world_capsules c
      where c.id = capsule_id and c.user_id = auth.uid()
    )
  );

-- No update policy for anybody, owner included. A beat is what happened.

create index if not exists world_beats_capsule_time
  on public.world_beats (capsule_id, created_at);


-- The public read. Takes an id and returns one world, never its owner.
-- security definer so it sees past row-level security; stable, and returning
-- only what a viewer needs so there is nothing else to mine.
create or replace function public.world_capsule(world_id uuid)
returns table (title text, capsule jsonb, beats jsonb)
language sql
security definer
stable
set search_path = public
as $$
  select
    w.title,
    w.capsule,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('kind', b.kind, 'text', b.text, 'at', b.created_at)
                         order by b.created_at, b.id)
        from public.world_beats b
        where b.capsule_id = w.id
      ),
      '[]'::jsonb
    ) as beats
  from public.world_capsules w
  where w.id = world_id
$$;

revoke all on function public.world_capsule(uuid) from public;
grant execute on function public.world_capsule(uuid) to anon, authenticated;


-- Verify, after running the above:
--
--   select count(*) from public.world_capsules;             -- 0, and no error
--   select count(*) from public.world_beats;                -- 0, and no error
--   select * from public.world_capsule(gen_random_uuid());  -- 0 rows, no error
--
-- And from a signed-out browser console on the site, both of these must come
-- back empty rather than as a list:
--
--   await supabase.from('world_capsules').select('id')
--   await supabase.from('world_beats').select('id')
