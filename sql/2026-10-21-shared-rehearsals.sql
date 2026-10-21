-- Shared rehearsals — a link that opens a blocked scene for anyone,
-- signed in or not.
--
-- Run this in the Supabase SQL editor. The Share button fails with a clear
-- message until it exists, so nothing breaks in the meantime.
--
-- The design point worth understanding: a share is meant to be reachable by
-- its link and NOT otherwise. A blanket "select using (true)" policy would
-- make the table readable in bulk with the public anon key, which means
-- anyone could list every scene anyone had ever shared. So this table has no
-- select policy at all, and reading goes through a security-definer function
-- that requires the id. No id, no row, no enumeration.

create table if not exists public.shared_rehearsals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'Rehearsal',
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

-- A dressed set with six performers is tens of kilobytes. This is generous
-- for that and still stops a single row being used as free storage. It is
-- enforced here rather than in the client, because the client is the part an
-- attacker controls.
alter table public.shared_rehearsals
  drop constraint if exists shared_rehearsals_data_size;
alter table public.shared_rehearsals
  add constraint shared_rehearsals_data_size check (pg_column_size(data) < 400000);

alter table public.shared_rehearsals enable row level security;

-- No select policy on purpose. See the note above.

drop policy if exists "creators insert their own shares" on public.shared_rehearsals;
create policy "creators insert their own shares"
  on public.shared_rehearsals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "creators read their own shares" on public.shared_rehearsals;
create policy "creators read their own shares"
  on public.shared_rehearsals
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "creators delete their own shares" on public.shared_rehearsals;
create policy "creators delete their own shares"
  on public.shared_rehearsals
  for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists shared_rehearsals_user_created
  on public.shared_rehearsals (user_id, created_at desc);

-- The public read. Takes an id and returns one row's content, never the
-- owner. security definer so it sees past row-level security; stable and
-- returning only two columns so there is nothing else to mine.
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
$$;

revoke all on function public.shared_rehearsal(uuid) from public;
grant execute on function public.shared_rehearsal(uuid) to anon, authenticated;

-- Verify, after running the above:
--
--   select count(*) from public.shared_rehearsals;          -- 0, and no error
--   select * from public.shared_rehearsal(gen_random_uuid()); -- 0 rows, no error
--
-- And from a signed-out browser console on the site, this must return
-- nothing rather than a list:
--
--   await supabase.from('shared_rehearsals').select('id')
