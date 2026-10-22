-- purchases: one row per sale
--
-- Run this in the Supabase SQL editor. It reports what it did as a table at
-- the end, and it is safe to run twice.
--
-- Why: a sale is a transaction, not a property of a (buyer, film) pair. The
-- table was unique on (user_id, creation_id) and both writers upserted on that
-- pair, so a buyer who bought the same film twice OVERWROTE their first
-- purchase — stripe_session_id included. The payouts row for that first sale
-- was left pointing at a session id with no matching purchase, so the creator
-- was owed for a sale the database had forgotten. See docs/payout-test.md,
-- step 7, where this was first written down as an open question.
--
-- After this, every sale is its own payable row, keyed on Stripe's session id.

begin;

create temp table mig_log (n int, step text, detail text) on commit drop;

do $$
declare
  r record;
  pair text[] := array['creation_id', 'user_id'];   -- sorted, to compare
  found_pk text := null;
  dropped int := 0;
begin
  /*
    Refuse to run if that pair is the PRIMARY KEY rather than a plain unique
    constraint. Dropping a primary key silently leaves a money table with no
    identity at all, and the right repair then is a surrogate key, which is a
    decision rather than a migration.
  */
  select c.conname into found_pk
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'purchases' and t.relnamespace = 'public'::regnamespace
    and c.contype = 'p'
    and (select array_agg(a.attname::text order by a.attname)
         from pg_attribute a
         where a.attrelid = t.oid and a.attnum = any (c.conkey)) = pair;

  if found_pk is not null then
    raise exception
      'purchases uses (user_id, creation_id) as its PRIMARY KEY (%). Stopping without changing anything: this needs a surrogate key added first.',
      found_pk;
  end if;

  -- Every sale needs its own identity, and Stripe's session id is it. Legacy
  -- rows may have no session id; a unique index permits many nulls, so those
  -- do not block this.
  if exists (
    select 1 from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    where t.relname = 'purchases' and t.relnamespace = 'public'::regnamespace
      and x.indisunique
      and (select array_agg(a.attname::text)
           from pg_attribute a
           where a.attrelid = t.oid and a.attnum = any (x.indkey)) = array['stripe_session_id']
  ) then
    insert into mig_log values (1, 'unique on stripe_session_id', 'already present');
  else
    create unique index purchases_stripe_session_id_key
      on public.purchases (stripe_session_id);
    insert into mig_log values (1, 'unique on stripe_session_id', 'created');
  end if;

  -- Now drop the pair uniqueness, as a constraint or as a bare index.
  for r in
    select c.conname as name
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'purchases' and t.relnamespace = 'public'::regnamespace
      and c.contype = 'u'
      and (select array_agg(a.attname::text order by a.attname)
           from pg_attribute a
           where a.attrelid = t.oid and a.attnum = any (c.conkey)) = pair
  loop
    execute format('alter table public.purchases drop constraint %I', r.name);
    insert into mig_log values (2, 'dropped constraint', r.name);
    dropped := dropped + 1;
  end loop;

  for r in
    select i.relname as name
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    where t.relname = 'purchases' and t.relnamespace = 'public'::regnamespace
      and x.indisunique
      and not exists (select 1 from pg_constraint c where c.conindid = x.indexrelid)
      and (select array_agg(a.attname::text order by a.attname)
           from pg_attribute a
           where a.attrelid = t.oid and a.attnum = any (x.indkey)) = pair
  loop
    execute format('drop index public.%I', r.name);
    insert into mig_log values (2, 'dropped index', r.name);
    dropped := dropped + 1;
  end loop;

  if dropped = 0 then
    insert into mig_log values (2, 'pair uniqueness', 'none found — already gone');
  end if;

  -- Reading sales for one film, and for one buyer, are both hot paths.
  if not exists (
    select 1 from pg_class where relname = 'purchases_creation_created' and relnamespace = 'public'::regnamespace
  ) then
    create index purchases_creation_created on public.purchases (creation_id, created_at desc);
    insert into mig_log values (3, 'index (creation_id, created_at)', 'created');
  else
    insert into mig_log values (3, 'index (creation_id, created_at)', 'already present');
  end if;

  if not exists (
    select 1 from pg_class where relname = 'purchases_user_creation' and relnamespace = 'public'::regnamespace
  ) then
    create index purchases_user_creation on public.purchases (user_id, creation_id);
    insert into mig_log values (4, 'index (user_id, creation_id)', 'created');
  else
    insert into mig_log values (4, 'index (user_id, creation_id)', 'already present');
  end if;
end $$;

-- What the table now guarantees.
insert into mig_log
select 5, 'unique indexes now on purchases',
       string_agg(
         i.relname || ' (' || (
           select string_agg(a.attname, ', ' order by a.attname)
           from pg_attribute a
           where a.attrelid = t.oid and a.attnum = any (x.indkey)
         ) || ')', '; ' order by i.relname)
from pg_index x
join pg_class i on i.oid = x.indexrelid
join pg_class t on t.oid = x.indrelid
where t.relname = 'purchases' and t.relnamespace = 'public'::regnamespace
  and x.indisunique;

-- Existing rows that would have been overwritten by the old behavior: the
-- same buyer and film more than once. Zero is expected; anything else is a
-- sale that was already lost and cannot be recovered from this table.
insert into mig_log
select 6, 'buyer+film pairs appearing more than once', coalesce(count(*)::text, '0')
from (
  select user_id, creation_id
  from public.purchases
  group by user_id, creation_id
  having count(*) > 1
) d;

select n as "#", step, detail from mig_log order by n, step;

commit;
