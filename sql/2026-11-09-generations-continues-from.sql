-- generations.continues_from — the take a Part 2 picks up from.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- A Part 2 opens on the last frame of an earlier take, with the same cast,
-- model and framing. This column is the only record that the two belong
-- together: without it a sequel is indistinguishable from any other take that
-- happens to start on an uploaded image, and nothing can ever show "this
-- continues that" or follow a chain of shots back to where it began.
--
-- It follows promoted_from, which records the same kind of fact for a draft
-- re-run at full quality. on delete set null, because deleting the first
-- take should orphan its sequel rather than delete it: the sequel is a
-- finished clip somebody paid for and stands on its own.
--
-- RUN THIS BEFORE USING THE BUTTON. api/generate-video.js writes this column
-- only when a take is actually a continuation, so ordinary generations are
-- unaffected whether or not this has been run — but a Part 2 pressed before
-- it exists would fail on insert and be refunded.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'generations' and column_name = 'continues_from'
  ) then
    alter table public.generations
      add column continues_from uuid references public.generations (id) on delete set null;
    raise notice 'generations.continues_from: added';
  else
    raise notice 'generations.continues_from: already present';
  end if;
end $$;

-- Reading a chain forwards ("what continues this take?") is a lookup by
-- parent. Partial, because almost no rows will ever have one.
create index if not exists generations_continues_from
  on public.generations (continues_from) where continues_from is not null;

-- Verify:
--   select count(*) from public.generations where continues_from is not null;  -- 0, no error
