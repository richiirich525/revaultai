-- Linking a drawn set back to the pack that made it, so a pack can be deleted.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- Why this is a separate migration. animated_sets records who drew a set and
-- which pending token it belonged to, but not which pack it was drawn FROM.
-- That is fine until somebody asks to delete one pack and keep another: with
-- no link, "delete this pack and everything made from it" cannot find the
-- drawings, and the promise in the product is exactly that.
--
-- on delete set null rather than cascade, deliberately. The delete route
-- removes the sets explicitly, because it has to delete their images from
-- object storage first and a cascade would take the rows away before anything
-- knew which files to purge. The set null is the safety net for every other
-- path that might remove a pack.

do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'animated_sets' and column_name = 'pack_id') then
    alter table public.animated_sets
      add column pack_id uuid references public.vault_entries (id) on delete set null;
    raise notice 'animated_sets.pack_id: added';
  else
    raise notice 'animated_sets.pack_id: already present';
  end if;
end $$;

create index if not exists animated_sets_pack on public.animated_sets (pack_id);

-- Verify:
--   select column_name from information_schema.columns
--    where table_name = 'animated_sets' and column_name = 'pack_id';   -- one row
