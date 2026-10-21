-- Schema check — does the database have what the code expects?
--
-- Paste into the Supabase SQL editor and run. Every row should say "ok".
-- Anything saying MISSING is a column the code writes or reads and the
-- database does not have, which shows up as a failed insert in a feature
-- nobody notices until they need it.
--
-- Safe to run any time: it reads information_schema and changes nothing.

with expected (tbl, col) as (
  values
    -- coverage_slots: written by Cover the scene, read by the project board.
    ('coverage_slots','id'), ('coverage_slots','user_id'), ('coverage_slots','project_id'),
    ('coverage_slots','plan_id'), ('coverage_slots','plan_label'), ('coverage_slots','slug'),
    ('coverage_slots','purpose'), ('coverage_slots','shot_size'), ('coverage_slots','camera'),
    ('coverage_slots','duration_seconds'), ('coverage_slots','priority'), ('coverage_slots','prompt'),
    ('coverage_slots','model_key'), ('coverage_slots','sort'), ('coverage_slots','manual_status'),
    -- the geometry half, so a staging audit can compare setups later
    ('coverage_slots','camera_x'), ('coverage_slots','camera_y'), ('coverage_slots','camera_rotation'),
    ('coverage_slots','lens_mm'), ('coverage_slots','camera_height'), ('coverage_slots','favors'),
    ('coverage_slots','actors'),

    -- profiles: the Stripe Connect columns the payout flow needs.
    ('profiles','stripe_account_id'), ('profiles','stripe_country'),
    ('profiles','stripe_payouts_enabled'), ('profiles','stripe_details_submitted'),

    -- shared_rehearsals: the share-a-link table.
    ('shared_rehearsals','id'), ('shared_rehearsals','user_id'),
    ('shared_rehearsals','title'), ('shared_rehearsals','data'),
    ('shared_rehearsals','created_at'),

    -- purchases: read by payouts-due and payouts-send to work out what is owed.
    ('purchases','creation_id'), ('purchases','stripe_session_id'),
    ('purchases','amount_total'), ('purchases','amount_net'),
    ('purchases','stripe_fee'), ('purchases','currency'), ('purchases','created_at'),

    -- payouts: the ledger of what has actually been sent.
    ('payouts','stripe_session_id'), ('payouts','creator_id'), ('payouts','creation_id'),
    ('payouts','amount_cents'), ('payouts','currency'), ('payouts','status'),
    ('payouts','stripe_account_id'), ('payouts','stripe_transfer_id'),
    ('payouts','error'), ('payouts','paid_at')
)
select
  e.tbl        as "table",
  e.col        as "column",
  case when c.column_name is null then 'MISSING' else 'ok' end as status,
  c.data_type  as type
from expected e
left join information_schema.columns c
  on c.table_schema = 'public' and c.table_name = e.tbl and c.column_name = e.col
order by status desc, e.tbl, e.col;

-- Row-level security must be on for all three.
select relname as "table",
       case when relrowsecurity then 'ok' else 'RLS OFF' end as status
from pg_class
where relname in ('coverage_slots','profiles','shared_rehearsals','payouts','purchases')
  and relnamespace = 'public'::regnamespace
order by relname;

-- And the public read function for shares must exist and be security definer.
select
  p.proname as "function",
  case when p.prosecdef then 'ok' else 'NOT security definer' end as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'shared_rehearsal';

-- payouts-send.js upserts with { onConflict: "stripe_session_id" }, which
-- Postgres can only honour if that column carries a unique constraint or
-- index. Without one the upsert errors and no payout is ever claimed.
select
  'payouts.stripe_session_id' as "needs to be unique",
  case when exists (
    select 1
    from pg_index i
    join pg_class t  on t.oid = i.indrelid
    join pg_class ix on ix.oid = i.indexrelid
    join pg_attribute a on a.attrelid = t.oid and a.attnum = any (i.indkey)
    where t.relname = 'payouts'
      and t.relnamespace = 'public'::regnamespace
      and a.attname = 'stripe_session_id'
      and i.indisunique
  ) then 'ok' else 'NO UNIQUE INDEX' end as status;

-- webhook.js upserts purchases with { onConflict: "user_id,creation_id" }, so
-- that pair needs a unique constraint too. Without it the sale is never
-- recorded, and a sale that was never recorded is never paid out.
select
  'purchases (user_id, creation_id)' as "needs to be unique",
  case when exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'purchases'
      and t.relnamespace = 'public'::regnamespace
      and c.contype in ('u','p')
      and (
        select array_agg(a.attname::text order by a.attname)
        from pg_attribute a
        where a.attrelid = t.oid and a.attnum = any (c.conkey)
      ) = array['creation_id','user_id']
  ) then 'ok' else 'NO UNIQUE CONSTRAINT' end as status;
