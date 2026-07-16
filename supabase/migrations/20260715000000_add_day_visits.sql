-- EVL-109: paid same-day walk-in passes. These rows are sales records, not
-- memberships or attendance check-ins. Price and local calendar date are
-- snapshots supplied by the offline-first client.

create table public.day_visits (
  id text primary key default public.uuid_generate_v7()::text,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  visit_type text not null,
  price numeric not null,
  visit_date date not null,
  subscriber_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  _deleted boolean not null default false,
  _modified timestamptz not null default now(),
  constraint day_visits_type_valid check (visit_type in ('gym', 'crossfit', 'both')),
  constraint day_visits_price_non_negative check (price >= 0),
  constraint day_visits_subscriber_organization_fkey
    foreign key (subscriber_id, organization_id)
    references public.subscribers (id, organization_id)
);

create trigger set_day_visits_updated_at
before update on public.day_visits
for each row
execute function public.set_updated_at();

create trigger set_day_visits_rxdb_sync_metadata
before insert or update on public.day_visits
for each row
execute function public.set_rxdb_sync_metadata();

create index day_visits_organization_rxdb_sync_idx
on public.day_visits (organization_id, _modified, id);

create index day_visits_organization_visit_date_idx
on public.day_visits (organization_id, visit_date desc);

create index day_visits_organization_subscriber_idx
on public.day_visits (organization_id, subscriber_id, visit_date desc);

alter table public.day_visits enable row level security;

grant select, insert, update on public.day_visits to authenticated;
grant select, insert, update, delete on public.day_visits to service_role;

create policy "Members can view organization day visits"
on public.day_visits
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy "Members can create organization day visits"
on public.day_visits
for insert
to authenticated
with check (public.is_active_organization_member(organization_id));

create policy "Members can update organization day visits"
on public.day_visits
for update
to authenticated
using (public.is_active_organization_member(organization_id))
with check (public.is_active_organization_member(organization_id));

alter publication supabase_realtime
add table public.day_visits;
