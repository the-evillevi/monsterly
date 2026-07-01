create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint organization_members_organization_user_key unique (organization_id, user_id)
);

create trigger set_organizations_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

create trigger set_organization_members_updated_at
before update on public.organization_members
for each row
execute function public.set_updated_at();

alter table public.subscriptions
drop constraint if exists subscriptions_subscriber_owner_fkey;

alter table public.renewals
drop constraint if exists renewals_subscription_owner_fkey;

alter table public.subscribers
drop constraint if exists subscribers_id_owner_id_key;

alter table public.subscriptions
drop constraint if exists subscriptions_id_owner_id_key;

drop index if exists public.subscribers_owner_active_idx;
drop index if exists public.subscriptions_owner_active_paid_until_idx;
drop index if exists public.subscriptions_subscriber_active_idx;
drop index if exists public.renewals_owner_created_at_idx;
drop index if exists public.renewals_subscription_created_at_idx;

alter table public.subscribers
add column organization_id uuid not null references public.organizations(id) on delete cascade;

alter table public.subscriptions
add column organization_id uuid not null references public.organizations(id) on delete cascade;

alter table public.renewals
add column organization_id uuid not null references public.organizations(id) on delete cascade;

alter table public.subscribers
drop column owner_id;

alter table public.subscriptions
drop column owner_id;

alter table public.renewals
drop column owner_id;

alter table public.subscribers
add constraint subscribers_id_organization_id_key unique (id, organization_id);

alter table public.subscriptions
add constraint subscriptions_id_organization_id_key unique (id, organization_id);

alter table public.subscriptions
add constraint subscriptions_subscriber_organization_fkey
foreign key (subscriber_id, organization_id)
references public.subscribers (id, organization_id)
on delete cascade;

alter table public.renewals
add constraint renewals_subscription_organization_fkey
foreign key (subscription_id, organization_id)
references public.subscriptions (id, organization_id)
on delete cascade;

create index organizations_active_idx
on public.organizations (name)
where deleted_at is null;

create index organization_members_user_active_idx
on public.organization_members (user_id, organization_id)
where status = 'active' and deleted_at is null;

create index organization_members_organization_active_idx
on public.organization_members (organization_id, user_id)
where status = 'active' and deleted_at is null;

create index subscribers_organization_active_idx
on public.subscribers (organization_id, name)
where deleted_at is null;

create index subscriptions_organization_active_paid_until_idx
on public.subscriptions (organization_id, paid_until_date)
where deleted_at is null;

create index subscriptions_organization_subscriber_active_idx
on public.subscriptions (organization_id, subscriber_id)
where deleted_at is null;

create index renewals_organization_created_at_idx
on public.renewals (organization_id, created_at desc)
where deleted_at is null;

create index renewals_organization_subscription_created_at_idx
on public.renewals (organization_id, subscription_id, created_at desc)
where deleted_at is null;

create or replace function public.is_active_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and status = 'active'
      and deleted_at is null
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscribers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.renewals enable row level security;

grant usage on schema public to authenticated;
revoke execute on function public.is_active_organization_member(uuid) from public;
grant execute on function public.is_active_organization_member(uuid) to authenticated;
grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update on public.subscribers to authenticated;
grant select, insert, update on public.subscriptions to authenticated;
grant select, insert, update on public.renewals to authenticated;

create policy "Members can view their organizations"
on public.organizations
for select
to authenticated
using (public.is_active_organization_member(id));

create policy "Members can view organization memberships"
on public.organization_members
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy "Members can view organization subscribers"
on public.subscribers
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy "Members can create organization subscribers"
on public.subscribers
for insert
to authenticated
with check (public.is_active_organization_member(organization_id));

create policy "Members can update organization subscribers"
on public.subscribers
for update
to authenticated
using (public.is_active_organization_member(organization_id))
with check (public.is_active_organization_member(organization_id));

create policy "Members can view organization subscriptions"
on public.subscriptions
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy "Members can create organization subscriptions"
on public.subscriptions
for insert
to authenticated
with check (public.is_active_organization_member(organization_id));

create policy "Members can update organization subscriptions"
on public.subscriptions
for update
to authenticated
using (public.is_active_organization_member(organization_id))
with check (public.is_active_organization_member(organization_id));

create policy "Members can view organization renewals"
on public.renewals
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy "Members can create organization renewals"
on public.renewals
for insert
to authenticated
with check (public.is_active_organization_member(organization_id));

create policy "Members can update organization renewals"
on public.renewals
for update
to authenticated
using (public.is_active_organization_member(organization_id))
with check (public.is_active_organization_member(organization_id));
