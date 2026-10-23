-- voice_takes — a recorded scene read-through.
--
-- Run this in the Supabase SQL editor. It reports what it did at the end and
-- is safe to run twice.
--
-- A separate table from `generations` on purpose. A voice take is not a video:
-- it has no aspect ratio, no start frame and no shot, and putting audio rows
-- into the table the gallery and Takes both read would have them turn up as
-- broken videos. Same shape where the shape is genuinely the same — one row
-- per job, keyed on fal's request id, refunded on failure — so the webhook
-- reads the same way.

begin;

create temp table mig_log (n int, step text, detail text) on commit drop;

create table if not exists public.voice_takes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  project_id       uuid,
  model            text not null,
  -- The script exactly as it went to the model. Kept so a take can be read
  -- back, compared against a re-record, and diagnosed without guessing at
  -- what was actually sent.
  script           text not null,
  speaker_names    text[] not null default '{}',
  line_count       int,
  chars            int,
  credits_spent    int not null default 0,
  status           text not null default 'queued',
  fal_request_id   text,
  -- Stored as an R2_PUBLIC_URL link, which is this app's way of recording
  -- where an object lives. That bucket is private: reads derive the key from
  -- this and presign it. See api/get-video-url.js.
  audio_url        text,
  duration_seconds numeric,
  error_message    text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
insert into mig_log values (1, 'table voice_takes', 'present');

alter table public.voice_takes drop constraint if exists voice_takes_status_known;
alter table public.voice_takes
  add constraint voice_takes_status_known
  check (status in ('queued', 'processing', 'complete', 'failed'));
insert into mig_log values (2, 'status is one of four', 'set');

-- A 30,000-character script is the model's own limit; this leaves room and
-- still stops the column being used as free storage.
alter table public.voice_takes drop constraint if exists voice_takes_script_len;
alter table public.voice_takes
  add constraint voice_takes_script_len
  check (char_length(script) <= 40000);
insert into mig_log values (3, 'script length cap', 'set');

/*
  The webhook finds a take by fal's request id, and fal can deliver the same
  webhook more than once. Unique so a redelivery updates the one row instead
  of creating a second, which is how the video path avoids paying twice.
  Nulls are allowed and a unique index permits many of them, so rows still
  waiting for a request id do not collide.
*/
create unique index if not exists voice_takes_fal_request_id_key
  on public.voice_takes (fal_request_id);
insert into mig_log values (4, 'unique on fal_request_id', 'present');

create index if not exists voice_takes_user_created
  on public.voice_takes (user_id, created_at desc);
insert into mig_log values (5, 'index (user_id, created_at)', 'present');

alter table public.voice_takes enable row level security;
insert into mig_log values (6, 'row level security', 'enabled');

-- Creators see and manage their own takes, and nobody else's. The webhook
-- writes with the service role, which is not subject to these.
drop policy if exists "creators read their own voice takes" on public.voice_takes;
create policy "creators read their own voice takes"
  on public.voice_takes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "creators insert their own voice takes" on public.voice_takes;
create policy "creators insert their own voice takes"
  on public.voice_takes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "creators delete their own voice takes" on public.voice_takes;
create policy "creators delete their own voice takes"
  on public.voice_takes for delete to authenticated
  using (auth.uid() = user_id);
insert into mig_log values (7, 'policies (select, insert, delete)', 'own rows only');

-- No update policy: a take's status, audio and duration are written by the
-- webhook under the service role. A creator has nothing to edit on one.
insert into mig_log values (8, 'update policy', 'none, on purpose — the webhook writes status');

insert into mig_log select 9, 'rows in voice_takes', count(*)::text from public.voice_takes;

select n as "#", step, detail from mig_log order by n;

commit;
