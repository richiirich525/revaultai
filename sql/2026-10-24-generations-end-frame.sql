-- generations.end_frame_url / end_frame_at — the frame a take actually ended on.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- Why this file exists late. The End Frame panel (src/EndFrame.jsx) writes
-- both of these columns, and the closing-frame feature shipped without a
-- migration to create them — so every save had been failing, quietly, in a
-- place nobody was looking. It surfaced from the other end: capsule
-- extraction selects these columns to find the image a world opens on, and
-- selecting a column that does not exist made a database full of takes report
-- as having none.
--
-- end_frame_url holds the R2 carrier form (R2_PUBLIC_URL/key) like every
-- other stored object here: the bucket is private and every read derives the
-- key and presigns it. end_frame_at is the second of the clip the frame was
-- taken from, which is how continuity knows where the next shot begins.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'generations' and column_name = 'end_frame_url'
  ) then
    alter table public.generations add column end_frame_url text;
    raise notice 'generations.end_frame_url: added';
  else
    raise notice 'generations.end_frame_url: already present';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'generations' and column_name = 'end_frame_at'
  ) then
    -- Seconds into the clip. Fractional, because a frame rarely lands on a
    -- whole second, and numeric rather than float so the value shown back to
    -- the creator is the value stored.
    alter table public.generations add column end_frame_at numeric(8, 3);
    raise notice 'generations.end_frame_at: added';
  else
    raise notice 'generations.end_frame_at: already present';
  end if;
end $$;

-- Verify, after running the above:
--
--   select column_name, data_type
--   from information_schema.columns
--   where table_name = 'generations' and column_name like 'end_frame%';
--
-- Two rows: end_frame_url (text) and end_frame_at (numeric).
