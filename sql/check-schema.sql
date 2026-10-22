-- Schema check — does the database have what the code expects?
--
-- ONE query on purpose. Supabase's SQL editor shows only the last result when
-- you run several statements, so a file of separate queries would quietly hide
-- all but the final one. Everything below unions into a single report, and
-- anything that is not "ok" sorts to the top.
--
-- Safe to run any time: it reads the catalog and changes nothing.
--
-- Verified against PostgreSQL 16 on a deliberately broken schema, so the
-- MISSING / RLS OFF / NO UNIQUE INDEX branches are known to fire rather than
-- assumed to.

with expected (tbl, col) as (
  values
    -- coverage_slots: written by Cover the scene, read by the project board.
    ('coverage_slots','id'), ('coverage_slots','user_id'), ('coverage_slots','project_id'),
    ('coverage_slots','plan_id'), ('coverage_slots','plan_label'), ('coverage_slots','slug'),
    ('coverage_slots','purpose'), ('coverage_slots','shot_size'), ('coverage_slots','camera'),
    ('coverage_slots','duration_seconds'), ('coverage_slots','priority'), ('coverage_slots','prompt'),
    ('coverage_slots','model_key'), ('coverage_slots','sort'), ('coverage_slots','manual_status'),
    ('coverage_slots','camera_x'), ('coverage_slots','camera_y'), ('coverage_slots','camera_rotation'),
    ('coverage_slots','lens_mm'), ('coverage_slots','camera_height'), ('coverage_slots','favors'),
    ('coverage_slots','actors'),

    -- profiles: the Stripe Connect columns the payout flow needs.
    ('profiles','stripe_account_id'), ('profiles','stripe_country'),
    ('profiles','stripe_payouts_enabled'), ('profiles','stripe_details_submitted'),

    -- shared_rehearsals: the share-a-link table.
    ('shared_rehearsals','id'), ('shared_rehearsals','user_id'),
    ('shared_rehearsals','title'), ('shared_rehearsals','data'), ('shared_rehearsals','created_at'),

    -- purchases: written by the Stripe webhook, read by both payout routes.
    ('purchases','user_id'), ('purchases','creation_id'), ('purchases','stripe_session_id'),
    ('purchases','amount_total'), ('purchases','amount_net'), ('purchases','stripe_fee'),
    ('purchases','currency'), ('purchases','created_at'),

    -- payouts: the ledger of what has actually been sent.
    ('payouts','stripe_session_id'), ('payouts','creator_id'), ('payouts','creation_id'),
    ('payouts','amount_cents'), ('payouts','currency'), ('payouts','status'),
    ('payouts','stripe_account_id'), ('payouts','stripe_transfer_id'),
    ('payouts','error'), ('payouts','paid_at')
),
tables (tbl) as (
  values ('coverage_slots'), ('profiles'), ('shared_rehearsals'), ('payouts'), ('purchases')
),
cols as (
  select 'column' as area, e.tbl || '.' || e.col as item,
         case when c.column_name is null then 'MISSING' else 'ok' end as status
  from expected e
  left join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = e.tbl and c.column_name = e.col
),
rls as (
  select 'row-level security' as area, t.tbl as item,
         case when c.oid is null then 'TABLE MISSING'
              when c.relrowsecurity then 'ok'
              else 'RLS OFF' end as status
  from tables t
  left join pg_class c on c.relname = t.tbl and c.relnamespace = 'public'::regnamespace
),
fn as (
  -- The public read for shares must exist AND be security definer, or it
  -- cannot see past row-level security and every share opens empty.
  select 'function' as area, 'shared_rehearsal(uuid)' as item,
         case when p.oid is null then 'MISSING'
              when p.prosecdef then 'ok'
              else 'NOT security definer' end as status
  from (select 1) one
  left join (
    select p.oid, p.prosecdef from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'shared_rehearsal'
  ) p on true
),
uniq as (
  -- payouts-send.js upserts on stripe_session_id; webhook.js upserts on
  -- (user_id, creation_id). Postgres can only honor an upsert whose conflict
  -- target is unique. Without these the upserts error, and the failures are
  -- invisible until the first real sale.
  select 'uniqueness' as area, 'payouts (stripe_session_id)' as item,
         case when exists (
           select 1 from pg_index i
           join pg_class t on t.oid = i.indrelid
           join pg_attribute a on a.attrelid = t.oid and a.attnum = any (i.indkey)
           where t.relname = 'payouts' and t.relnamespace = 'public'::regnamespace
             and a.attname = 'stripe_session_id' and i.indisunique
         ) then 'ok' else 'NO UNIQUE INDEX' end as status
  union all
  -- A sale is identified by its Stripe session, so that is what must be unique.
  select 'uniqueness', 'purchases (stripe_session_id)',
         case when exists (
           select 1 from pg_index x
           join pg_class t on t.oid = x.indrelid
           where t.relname = 'purchases' and t.relnamespace = 'public'::regnamespace
             and x.indisunique
             and (select array_agg(a.attname::text)
                  from pg_attribute a
                  where a.attrelid = t.oid and a.attnum = any (x.indkey))
                 = array['stripe_session_id']
         ) then 'ok' else 'NO UNIQUE INDEX' end
  union all
  -- And the buyer+film pair must NOT be unique any more: while it was, a second
  -- purchase of the same film overwrote the first and orphaned its payout.
  select 'uniqueness', 'purchases (user_id, creation_id) is not unique',
         case when exists (
           select 1 from pg_index x
           join pg_class t on t.oid = x.indrelid
           where t.relname = 'purchases' and t.relnamespace = 'public'::regnamespace
             and x.indisunique
             and (select array_agg(a.attname::text order by a.attname)
                  from pg_attribute a
                  where a.attrelid = t.oid and a.attnum = any (x.indkey))
                 = array['creation_id','user_id']
         ) then 'STILL UNIQUE — run 2026-10-21-purchases-one-row-per-sale.sql' else 'ok' end
)
select area, item, status
from (select * from cols union all select * from rls
      union all select * from fn union all select * from uniq) r
order by (status = 'ok'), area, item;
