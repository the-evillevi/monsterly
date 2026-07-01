alter table public.subscribers
add column if not exists _deleted boolean not null default false,
add column if not exists _modified timestamptz not null default now();

alter table public.subscriptions
add column if not exists _deleted boolean not null default false,
add column if not exists _modified timestamptz not null default now();

alter table public.renewals
add column if not exists _deleted boolean not null default false,
add column if not exists _modified timestamptz not null default now();

create or replace function public.set_rxdb_sync_metadata()
returns trigger
language plpgsql
as $$
begin
  new._modified = now();
  new._deleted = new.deleted_at is not null;
  return new;
end;
$$;

create trigger set_subscribers_rxdb_sync_metadata
before insert or update on public.subscribers
for each row
execute function public.set_rxdb_sync_metadata();

create trigger set_subscriptions_rxdb_sync_metadata
before insert or update on public.subscriptions
for each row
execute function public.set_rxdb_sync_metadata();

create trigger set_renewals_rxdb_sync_metadata
before insert or update on public.renewals
for each row
execute function public.set_rxdb_sync_metadata();

create index if not exists subscribers_organization_rxdb_sync_idx
on public.subscribers (organization_id, _modified, id);

create index if not exists subscriptions_organization_rxdb_sync_idx
on public.subscriptions (organization_id, _modified, id);

create index if not exists renewals_organization_rxdb_sync_idx
on public.renewals (organization_id, _modified, id);
