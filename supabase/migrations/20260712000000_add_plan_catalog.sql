-- EVL-106: plan catalog with facility access (Dragonz weightlifting gym +
-- Monsters CrossFit box are facilities of one organization — tenancy stays
-- single-org). Subscriptions gain a plan_id FK while keeping plan_name/price
-- as the point-of-sale snapshot, so historical rows preserve what was
-- actually paid when catalog prices change. subscriptions.kind is deprecated
-- in favor of the plan's facility set but stays populated for legacy readers.

create table public.plans (
  id text primary key default public.uuid_generate_v7()::text,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  price numeric not null,
  facility_access text[] not null,
  weekly_visit_limit integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  _deleted boolean not null default false,
  _modified timestamptz not null default now(),
  constraint plans_price_non_negative check (price >= 0),
  constraint plans_weekly_visit_limit_positive check (
    weekly_visit_limit is null or weekly_visit_limit > 0
  ),
  constraint plans_facility_access_valid check (
    facility_access <@ array['dragonz', 'monsters']::text[]
    and cardinality(facility_access) >= 1
  ),
  constraint plans_id_organization_id_key unique (id, organization_id),
  constraint plans_organization_name_key unique (organization_id, name)
);

create trigger set_plans_updated_at
before update on public.plans
for each row
execute function public.set_updated_at();

create trigger set_plans_rxdb_sync_metadata
before insert or update on public.plans
for each row
execute function public.set_rxdb_sync_metadata();

create index plans_organization_rxdb_sync_idx
on public.plans (organization_id, _modified, id);

create index plans_organization_name_idx
on public.plans (organization_id, name)
where deleted_at is null;

alter table public.plans enable row level security;

grant select, insert, update on public.plans to authenticated;
grant select, insert, update, delete on public.plans to service_role;

create policy "Members can view organization plans"
on public.plans
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy "Members can create organization plans"
on public.plans
for insert
to authenticated
with check (public.is_active_organization_member(organization_id));

create policy "Members can update organization plans"
on public.plans
for update
to authenticated
using (public.is_active_organization_member(organization_id))
with check (public.is_active_organization_member(organization_id));

alter publication supabase_realtime
add table public.plans;

-- Monsters Fitness Club catalog: the four canonical plans Ángel fixed
-- ("solamente puede tener estas opciones, si o si") plus the two grandfathered
-- legacy plans existing members keep (not offered at registration). Fixed
-- UUIDv7 ids so local and prod hold identical rows; guarded on the
-- organization existing so fresh environments migrate cleanly.
insert into public.plans (id, organization_id, name, price, facility_access, weekly_visit_limit, active)
select seed.id, seed.organization_id::uuid, seed.name, seed.price, seed.facility_access, seed.weekly_visit_limit, seed.active
from (
  values
    ('019f56a2-46d5-71f8-b02c-d888e734e3e3', '4bf990ae-b365-4c8c-b983-8498a6940e8f',
     'Gimnasio', 300::numeric, array['dragonz'], null::integer, true),
    ('019f56a2-46d7-77ef-b0f8-8478862ac85d', '4bf990ae-b365-4c8c-b983-8498a6940e8f',
     'CrossFit (3 días)', 350, array['monsters'], 3, true),
    ('019f56a2-46d7-77ef-b0f8-8993b7c5858d', '4bf990ae-b365-4c8c-b983-8498a6940e8f',
     'CrossFit (Regular)', 450, array['monsters'], null, true),
    ('019f56a2-46d7-77ef-b0f8-8d372df3355f', '4bf990ae-b365-4c8c-b983-8498a6940e8f',
     'Combo', 600, array['dragonz', 'monsters'], null, true),
    ('019f56a2-46d7-77ef-b0f8-91311518535e', '4bf990ae-b365-4c8c-b983-8498a6940e8f',
     'Programación', 500, array['monsters'], null, false),
    ('019f56a2-46d7-77ef-b0f8-9474f7dd3f84', '4bf990ae-b365-4c8c-b983-8498a6940e8f',
     'Fundadores', 365, array['monsters'], null, false)
) as seed(id, organization_id, name, price, facility_access, weekly_visit_limit, active)
where exists (
  select 1 from public.organizations where id = seed.organization_id::uuid
)
on conflict (id) do nothing;

alter table public.subscriptions
add column if not exists plan_id text;

alter table public.subscriptions
add constraint subscriptions_plan_organization_fkey
foreign key (plan_id, organization_id)
references public.plans (id, organization_id);

-- Remap the imported EVL-103 subscriptions onto the catalog by their
-- point-of-sale plan_name. Snapshots (plan_name/price) stay untouched, so
-- members who paid a discounted or historical price keep that record; both
-- "3 días" spellings collapse onto the same plan. Rows without a plan_name
-- (app-created before the catalog) stay unlinked. The _modified trigger bump
-- replicates the new plan_id to clients.
update public.subscriptions s
set plan_id = p.id
from (
  values
    ('Regular', 'CrossFit (Regular)'),
    ('3 días por semana', 'CrossFit (3 días)'),
    ('3 días por mes', 'CrossFit (3 días)'),
    ('Programación', 'Programación'),
    ('Fundadores', 'Fundadores')
) as mapping(old_name, new_name)
join public.plans p on p.name = mapping.new_name
where s.plan_name = mapping.old_name
  and s.organization_id = p.organization_id
  and s.plan_id is null;
