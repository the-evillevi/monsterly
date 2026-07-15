-- EVL-93: front-desk check-in log. One row per scan of a member's check-in
-- code. Rows carry no derived status — the app computes traffic-light state
-- at render time from paid_until_date, so a feed entry reflects the member's
-- *current* standing. Realtime publication keeps the dashboard feed live
-- through the existing RxDB pull replication.

create table public.check_ins (
  id text primary key default public.uuid_generate_v7()::text,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscriber_id text not null,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  _deleted boolean not null default false,
  _modified timestamptz not null default now(),
  constraint check_ins_subscriber_organization_fkey
    foreign key (subscriber_id, organization_id)
    references public.subscribers (id, organization_id)
);

create trigger set_check_ins_updated_at
before update on public.check_ins
for each row
execute function public.set_updated_at();

create trigger set_check_ins_rxdb_sync_metadata
before insert or update on public.check_ins
for each row
execute function public.set_rxdb_sync_metadata();

create index check_ins_organization_rxdb_sync_idx
on public.check_ins (organization_id, _modified, id);

create index check_ins_organization_checked_in_at_idx
on public.check_ins (organization_id, checked_in_at desc);

create index check_ins_organization_subscriber_idx
on public.check_ins (organization_id, subscriber_id, checked_in_at desc);

alter table public.check_ins enable row level security;

grant select, insert, update on public.check_ins to authenticated;
grant select, insert, update, delete on public.check_ins to service_role;

create policy "Members can view organization check-ins"
on public.check_ins
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy "Members can create organization check-ins"
on public.check_ins
for insert
to authenticated
with check (public.is_active_organization_member(organization_id));

create policy "Members can update organization check-ins"
on public.check_ins
for update
to authenticated
using (public.is_active_organization_member(organization_id))
with check (public.is_active_organization_member(organization_id));

alter publication supabase_realtime
add table public.check_ins;
