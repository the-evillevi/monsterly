-- Three-tier subscriber identifiers (EVL-105):
--   id            immutable UUIDv7 primary key; the only value FKs bind to.
--   slug          human-readable URL identifier; regenerated on rename.
--   check_in_code stable numeric front-desk PIN; never changes.
-- Plus proper Mexican name fields (apellido paterno y materno).
--
-- Generation is client-side (offline-first: rows are minted in the browser and
-- sync later). Postgres has no native uuidv7() until pg18, so ship a fallback
-- for server-side inserts.

create or replace function public.uuid_generate_v7()
returns uuid
language sql
volatile
as $$
  -- UUIDv4 randomness with the first 48 bits overwritten by the unix
  -- millisecond timestamp, then version/variant bits patched to v7.
  select encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$$;

alter table public.subscribers
alter column id set default public.uuid_generate_v7()::text;

alter table public.subscriptions
alter column id set default public.uuid_generate_v7()::text;

alter table public.renewals
alter column id set default public.uuid_generate_v7()::text;

alter table public.subscribers
add column if not exists paternal_last_name text,
add column if not exists maternal_last_name text,
add column if not exists slug text,
add column if not exists check_in_code text;

alter table public.subscribers
drop constraint if exists subscribers_check_in_code_format;

-- 4-6 digit numeric PIN: keypad-friendly and short enough to read aloud.
alter table public.subscribers
add constraint subscribers_check_in_code_format
check (check_in_code is null or check_in_code ~ '^[0-9]{4,6}$');

-- Globally unique (user decision), nullable so pre-backfill rows never
-- collide. Clients generate values; these indexes are the multi-device
-- backstop (regenerate-and-retry on push conflict).
create unique index if not exists subscribers_slug_key
on public.subscribers (slug);

create unique index if not exists subscribers_check_in_code_key
on public.subscribers (check_in_code);

-- Backfill identifiers for pre-existing rows (demo/seed data). The EVL-103
-- import-% rows are deliberately skipped: the transient re-key migration
-- replaces them wholesale with UUIDv7 rows carrying curated slugs and PINs.
do $$
declare
  subscriber record;
  candidate_slug text;
  candidate_code text;
begin
  for subscriber in
    select id, name
    from public.subscribers
    where slug is null
      and id not like 'import-%'
  loop
    loop
      candidate_slug := trim(both '-' from regexp_replace(
        lower(translate(
          subscriber.name,
          'áéíóúüñÁÉÍÓÚÜÑ',
          'aeiouunAEIOUUN'
        )),
        '[^a-z0-9]+', '-', 'g'
      )) || '-' || (
        select string_agg(
          substr('abcdefghjkmnpqrstuvwxyz23456789', (random() * 30)::int + 1, 1),
          ''
        )
        from generate_series(1, 4)
      );

      exit when not exists (select 1 from public.subscribers where slug = candidate_slug);
    end loop;

    loop
      candidate_code := ((random() * 8)::int + 1)::text
        || lpad((random() * 99999)::int::text, 5, '0');

      exit when not exists (
        select 1 from public.subscribers where check_in_code = candidate_code
      );
    end loop;

    update public.subscribers
    set slug = candidate_slug,
        check_in_code = candidate_code
    where id = subscriber.id;
  end loop;
end;
$$;
