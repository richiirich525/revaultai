-- Questions asked of the site's assistant.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- Two jobs in one table, and the second is the better one.
--
-- The first is metering. An endpoint that calls a paid model and is open to
-- anybody is free money for whoever finds it, and this codebase has reached
-- that conclusion twice already — anonymous packs and anonymous share links
-- are both counted per caller per day. Same here.
--
-- The second is that what people ask is the most useful product research a
-- founder can have, and it arrives for free. A question nobody could answer
-- is a page that needs writing. A question asked nine times is a thing the
-- interface should have said without being asked. `grounded` records whether
-- the assistant could answer at all, so the gaps are a query rather than a
-- feeling.

create table if not exists public.help_questions (
  id         uuid primary key default gen_random_uuid(),
  -- Null for somebody who has not signed in. Set null rather than cascade on
  -- account deletion: the question stays useful and stops being theirs.
  user_id    uuid references auth.users (id) on delete set null,
  -- A salted hash, never an address. Same treatment as anonymous shares.
  ip_hash    text,
  question   text not null,
  -- Did it answer, or did it say it did not know? The second is the valuable
  -- row.
  grounded   boolean,
  pages      text[],
  created_at timestamptz not null default now()
);

alter table public.help_questions enable row level security;

-- No policies at all. Nothing here is written or read by a client: the route
-- writes with the service role, and reading other people's questions is not
-- something any visitor should be able to do.

create index if not exists help_questions_meter_idx
  on public.help_questions (ip_hash, created_at desc);
create index if not exists help_questions_user_idx
  on public.help_questions (user_id, created_at desc);

-- What is worth reading later:
--   select question, count(*) from public.help_questions
--   where grounded is false group by 1 order by 2 desc limit 20;
--
-- Verify:
--   select count(*) from public.help_questions;   -- 0, no error
--
-- Signed out, in a browser console, this must come back empty:
--   await supabase.from('help_questions').select('id')
