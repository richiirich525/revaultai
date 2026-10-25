-- Lot Booth and Phone Remote — a pack built from more than one frame.
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- One selfie makes a pack that holds up from one angle. The models take 9 to
-- 12 reference images, and the difference between one frame and six is the
-- difference between a face that survives a profile shot and one that does
-- not. That is the whole reason the booth exists, and the phone path is the
-- same mechanism without the rig.
--
-- The problem both share is that the frames have to arrive from a device
-- that is not the one you are sitting at: a laptop has one bad camera, and a
-- booth has an operator standing at a console. So a capture is a session
-- with a short code, and whatever device holds the camera posts frames into
-- it. Same table for both paths; `source` records which one it was, because
-- a studio-shot pack is the supply advantage and has to be distinguishable
-- from a phone one by something better than a guess.
--
-- WHAT THIS DOES NOT DO: it does not verify that the frames are the same
-- person. Every frame runs the same gates as a single selfie, so a minor or
-- a public figure is refused frame by frame, but nothing here would stop a
-- determined person from capturing two faces into one pack. Face matching
-- across frames needs a real matcher, the same one age estimation wants, and
-- api/capture-frame.js marks the line where it goes. The session being one
-- device over a few minutes is a weak mitigation, not a control, and it is
-- written down as weak rather than described as a check.

create table if not exists public.capture_sessions (
  id          uuid primary key default gen_random_uuid(),
  -- Typed by a human off a laptop screen, so short and unambiguous. The
  -- endpoint draws it from an alphabet with no O/0 or I/1.
  code        text not null unique,
  -- Null for somebody who has not signed in yet: the phone path has to work
  -- before an account exists, exactly as the single-selfie path does.
  owner_id    uuid references auth.users (id) on delete cascade,
  source      text not null default 'phone-remote',
  -- Booth only. Who ran the capture, and on which rig. A booth session with
  -- no operator is somebody claiming studio provenance they do not have,
  -- which is why the constraint below refuses it in the database rather than
  -- trusting the endpoint.
  operator_id uuid references auth.users (id) on delete cascade,
  rig         text,
  status      text not null default 'open',
  -- Cascade, not set null. A capture is the same face as the pack, stored in
  -- a second place, so a pack that dies has to take its frames with it. With
  -- `set null` the rows survive the pack with a dangling pointer, and that is
  -- exactly how end_frame_url came to be written for months into a column
  -- that did not exist: nothing was watching the second place. The endpoint
  -- still purges the files BEFORE dropping the pack, because cascade frees
  -- rows and R2 objects are not rows.
  pack_id     uuid references public.vault_entries (id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- Short. A code on a screen is a credential, and the capture happens in
  -- the next few minutes or not at all.
  expires_at  timestamptz not null default now() + interval '45 minutes',
  constraint capture_sessions_source check (source in ('phone-remote', 'booth')),
  constraint capture_sessions_status check (status in ('open', 'built', 'canceled')),
  constraint capture_sessions_booth_operator
    check (source <> 'booth' or operator_id is not null)
);

alter table public.capture_sessions enable row level security;

-- No select policy by design: a code is guessable enough that the table must
-- not be enumerable, and every read goes through capture_session_view below,
-- which needs the code. Writes are server-side with the service role.
drop policy if exists "owners read their own captures" on public.capture_sessions;
create policy "owners read their own captures"
  on public.capture_sessions for select to authenticated using (auth.uid() = owner_id);

create index if not exists capture_sessions_owner_idx
  on public.capture_sessions (owner_id, created_at desc);

create table if not exists public.capture_frames (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.capture_sessions (id) on delete cascade,
  -- Which angle this is. One row per angle per session, which caps a session
  -- at the size of the angle vocabulary without a trigger and makes the
  -- frame count mean something: six frames are six angles, not six taps of
  -- the same one.
  pose        text not null,
  image_url   text not null,
  -- What the vision pass saw. Kept so a refusal can be explained later and
  -- so a mismatch across frames is reviewable by a person.
  read        jsonb,
  created_at  timestamptz not null default now(),
  constraint capture_frames_one_per_pose unique (session_id, pose)
);

alter table public.capture_frames enable row level security;
-- No policies at all. Frames are faces: they reach a client only through the
-- session view, and only as a count and a list of angles, never as URLs.

create index if not exists capture_frames_session_idx
  on public.capture_frames (session_id, created_at);

-- The thin public read. A code holder learns how far along the capture is
-- and nothing else: no image URLs, no owner, no read output. The laptop
-- polls this to light up angles as the phone shoots them.
create or replace function public.capture_session_view(p_code text)
returns table (source text, status text, shot text[], pack_id uuid, expired boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.source,
    s.status,
    coalesce(
      (select array_agg(f.pose order by f.created_at)
         from public.capture_frames f where f.session_id = s.id),
      array[]::text[]
    ) as shot,
    s.pack_id,
    (s.expires_at < now()) as expired
  from public.capture_sessions s
  where s.code = upper(p_code)
$$;

revoke all on function public.capture_session_view(text) from public;
grant execute on function public.capture_session_view(text) to anon, authenticated;

-- Every stored frame for a pack, so a deleter can purge the objects before
-- the rows go. Read-only and service-role only: these are URLs to faces, and
-- the whole reason capture_frames has no select policy is that no client
-- should ever hold one.
create or replace function public.capture_keys_for_pack(p_pack uuid)
returns setof text
language sql
security definer
stable
set search_path = public
as $$
  select f.image_url
  from public.capture_frames f
  join public.capture_sessions s on s.id = f.session_id
  where s.pack_id = p_pack
$$;

revoke all on function public.capture_keys_for_pack(uuid) from public;
grant execute on function public.capture_keys_for_pack(uuid) to service_role;

-- Verify:
--   select count(*) from public.capture_sessions;              -- 0, no error
--   select * from public.capture_session_view('ZZZZZZ');        -- 0 rows, no error
--
-- Signed out, in a browser console, both must come back empty:
--   await supabase.from('capture_sessions').select('id')
--   await supabase.from('capture_frames').select('id')
