-- prompt_extractions — what a take's own prompt says about who and where.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- Why this table exists. Capsule extraction reads the Vault and the Shot
-- Spec, and measured against 71 finished takes it found a usable cast in
-- none of them: 52 referenced nothing at all, and 19 named people the spec
-- never described. Every take has a prompt, though, and a prompt like "Nell
-- waits at the sink in a gray cardigan" carries a cast, a set and a state in
-- prose that nothing was reading.
--
-- Derived, never authored. This is a model's reading of the creator's own
-- words, so it is kept apart from film_specs rather than written into it —
-- a spec is what the creator said, and mixing a guess into it would make the
-- two indistinguishable later. The capsule treats this as the weakest of its
-- sources and marks anyone it supplies as inferred rather than locked.
--
-- One row per take, so re-running extraction updates rather than duplicates.

create table if not exists public.prompt_extractions (
  generation_id  uuid primary key references public.generations (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  extracted      jsonb not null,
  model          text,
  created_at     timestamptz not null default now()
);

-- A reading of one prompt is a few hundred bytes. This is generous for that
-- and still stops a row being used as storage. Enforced here because the
-- model's output is not something the server should trust by size either.
alter table public.prompt_extractions
  drop constraint if exists prompt_extractions_size;
alter table public.prompt_extractions
  add constraint prompt_extractions_size check (pg_column_size(extracted) < 20000);

alter table public.prompt_extractions enable row level security;

drop policy if exists "creators read their own extractions" on public.prompt_extractions;
create policy "creators read their own extractions"
  on public.prompt_extractions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "creators delete their own extractions" on public.prompt_extractions;
create policy "creators delete their own extractions"
  on public.prompt_extractions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- No insert or update policy: extraction is a server job, written with the
-- service role. A client that could write here could put any identity into
-- anyone's world.

create index if not exists prompt_extractions_user
  on public.prompt_extractions (user_id, created_at desc);

-- Verify, after running the above:
--
--   select count(*) from public.prompt_extractions;   -- 0, and no error
--
-- And from a signed-out browser console on the site:
--
--   await supabase.from('prompt_extractions').select('generation_id')   -- []
