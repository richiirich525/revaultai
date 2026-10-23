-- Vault voices — a character's voice, locked the way their wardrobe is.
--
-- Run this in the Supabase SQL editor. It reports what it did at the end and
-- is safe to run twice.
--
-- Why it belongs in the Vault rather than in the recording studio: the Vault's
-- whole promise is that a character is described once and every tool
-- downstream reuses that description word for word, which is what keeps a face
-- recognizable from cut to cut. A voice is the same problem in sound. Put the
-- voice on the scene instead and Ruth sounds like a different person in every
-- scene you record, which is exactly the drift the Vault exists to stop.
--
-- Two columns, because there are two ways to have a voice:
--
--   voice_preset     — one of the model's named voices, chosen from a list.
--   voice_sample_url — a recording of the voice you actually want, which the
--                      model clones. Takes precedence when both are set.
--
-- The sample column is added now and used by a later change: adding one
-- column in a second migration later is worse than adding both once, and the
-- recording studio reads whichever is present from day one.

begin;

create temp table mig_log (n int, step text, detail text) on commit drop;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vault_entries' and column_name = 'voice_preset'
  ) then
    alter table public.vault_entries add column voice_preset text;
    insert into mig_log values (1, 'vault_entries.voice_preset', 'added');
  else
    insert into mig_log values (1, 'vault_entries.voice_preset', 'already present');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vault_entries' and column_name = 'voice_sample_url'
  ) then
    alter table public.vault_entries add column voice_sample_url text;
    insert into mig_log values (2, 'vault_entries.voice_sample_url', 'added');
  else
    insert into mig_log values (2, 'vault_entries.voice_sample_url', 'already present');
  end if;

  /*
    A preset is a name from the model's own list, and a sample has to be a
    URL the model can fetch. Enforced here rather than only in the client,
    because the client is the part somebody else can edit. Both stay nullable:
    a character with no voice set reads in the default.
  */
  alter table public.vault_entries drop constraint if exists vault_entries_voice_preset_len;
  alter table public.vault_entries
    add constraint vault_entries_voice_preset_len
    check (voice_preset is null or char_length(voice_preset) between 1 and 60);
  insert into mig_log values (3, 'voice_preset length check', 'set');

  alter table public.vault_entries drop constraint if exists vault_entries_voice_sample_https;
  alter table public.vault_entries
    add constraint vault_entries_voice_sample_https
    check (voice_sample_url is null or voice_sample_url ~ '^https://');
  insert into mig_log values (4, 'voice_sample_url must be https', 'set');
end $$;

-- How many characters have a voice yet. Zero on the first run.
insert into mig_log
select 5, 'characters with a voice set',
       count(*) filter (where voice_preset is not null or voice_sample_url is not null)
         || ' of ' || count(*) || ' characters'
from public.vault_entries
where kind = 'character';

select n as "#", step, detail from mig_log order by n;

commit;
