-- Does the DEPLOYED shared_rehearsals table actually resist enumeration?
--
-- Paste the whole file into the Supabase SQL editor and run it. It:
--   1. inserts one throwaway share owned by a real user,
--   2. re-runs every read and write as the public `anon` role — the same
--      role the website's public key uses,
--   3. prints a PASS/FAIL table,
--   4. rolls the whole thing back, so nothing is left behind.
--
-- Nothing is written permanently. Safe to run on production.

begin;

create temp table rls_results (
  n int, step text, expected text, got text, verdict text
) on commit drop;

-- A real user to own the probe row (the table has an FK to auth.users).
create temp table rls_probe (uid uuid, sid uuid) on commit drop;
insert into rls_probe
  select id, '00000000-dead-beef-0000-000000000001'::uuid from auth.users order by created_at limit 1;

do $$
declare
  v_uid uuid;
  v_sid uuid;
  n int;
  t text;
begin
  select uid, sid into v_uid, v_sid from rls_probe;
  if v_uid is null then
    insert into rls_results values (0,'precondition','at least one user in auth.users','none','SKIPPED — no users to own a probe row');
    return;
  end if;

  insert into public.shared_rehearsals (id, user_id, title, data)
    values (v_sid, v_uid, 'RLS probe (rolled back)', '{"probe":true}'::jsonb);

  insert into rls_results values (0,'setup','1 probe share now in the table','1 row','OK');

  ---------------------------------------------------------------- as anon
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;

  select count(*) into n from public.shared_rehearsals;
  reset role;
  insert into rls_results values (1,'anon lists the whole table','0 rows', n || ' rows',
    case when n = 0 then 'PASS' else 'FAIL — SHARES ARE ENUMERABLE' end);

  set local role anon;
  select count(*) into n from public.shared_rehearsals where id = v_sid;
  reset role;
  insert into rls_results values (2,'anon selects a share by its exact id','0 rows', n || ' rows',
    case when n = 0 then 'PASS' else 'FAIL — direct table read works' end);

  set local role anon;
  select count(*) into n from public.shared_rehearsal(v_sid);
  reset role;
  insert into rls_results values (3,'anon opens the share via the link function','1 row', n || ' rows',
    case when n = 1 then 'PASS' else 'FAIL — share links are broken' end);

  set local role anon;
  select count(*) into n from public.shared_rehearsal(gen_random_uuid());
  reset role;
  insert into rls_results values (4,'anon guesses a random share id','0 rows', n || ' rows',
    case when n = 0 then 'PASS' else 'FAIL' end);

  -- the function must hand back the scene and nothing about who made it
  select string_agg(a.attname, ', ' order by a.attnum) into t
  from pg_proc p
  join unnest(p.proallargtypes) with ordinality u(typ, ord) on true
  join lateral (select p.proargnames[u.ord] as attname, u.ord as attnum) a on true
  where p.pronamespace = 'public'::regnamespace and p.proname = 'shared_rehearsal'
    and p.proargmodes[u.ord] = 't';
  insert into rls_results values (5,'what the link function returns','title, data', coalesce(t,'(unreadable)'),
    case when coalesce(t,'') = 'title, data' then 'PASS' else 'FAIL — leaks a column' end);

  begin
    set local role anon;
    insert into public.shared_rehearsals (user_id, title, data) values (v_uid, 'anon spam', '{}'::jsonb);
    reset role;
    insert into rls_results values (6,'anon writes a new share','blocked','inserted','FAIL — ANYONE CAN WRITE');
  exception when others then
    reset role;
    insert into rls_results values (6,'anon writes a new share','blocked','blocked: ' || left(SQLERRM, 40),'PASS');
  end;

  set local role anon;
  with d as (delete from public.shared_rehearsals returning 1) select count(*) into n from d;
  reset role;
  insert into rls_results values (7,'anon deletes every share','0 deleted', n || ' deleted',
    case when n = 0 then 'PASS' else 'FAIL — ANYONE CAN DELETE' end);

  set local role anon;
  with u2 as (update public.shared_rehearsals set title = 'hacked' returning 1) select count(*) into n from u2;
  reset role;
  insert into rls_results values (8,'anon rewrites every share','0 changed', n || ' changed',
    case when n = 0 then 'PASS' else 'FAIL — ANYONE CAN EDIT' end);

  ------------------------------------------------- as a different signed-in user
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  select count(*) into n from public.shared_rehearsals;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  insert into rls_results values (9,'another signed-in user lists the table','0 rows', n || ' rows',
    case when n = 0 then 'PASS' else 'FAIL — users see each others shares' end);

  -- is row level security even switched on?
  select case when relrowsecurity then 'on' else 'OFF' end into t
  from pg_class where oid = 'public.shared_rehearsals'::regclass;
  insert into rls_results values (10,'row level security on the table','on', t,
    case when t = 'on' then 'PASS' else 'FAIL — RLS IS OFF' end);

  -- and is there a select policy that would open it up?
  select coalesce(string_agg(polname, '; '), '(none — correct)') into t
  from pg_policy where polrelid = 'public.shared_rehearsals'::regclass and polcmd = 'r'
    and 'anon' = any (select rolname from pg_roles where oid = any (polroles));
  insert into rls_results values (11,'select policies granted to anon','(none — correct)', t,
    case when t = '(none — correct)' then 'PASS' else 'FAIL — a policy exposes the table' end);
end $$;

select n as "#", step, expected, got, verdict from rls_results order by n;

rollback;
