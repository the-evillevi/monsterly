create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  gender text not null default 'unspecified',
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('gym', 'crossfit')),
  billing_period text not null check (
    billing_period in ('weekly', 'monthly', 'bimonthly', 'six_monthly', 'yearly', 'custom')
  ),
  custom_days integer,
  start_date date not null,
  paid_until_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint subscriptions_custom_days_matches_billing_period check (
    (
      billing_period = 'custom'
      and custom_days is not null
      and custom_days > 0
    )
    or (
      billing_period <> 'custom'
      and custom_days is null
    )
  )
);

create table public.renewals (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  previous_paid_until_date date not null,
  new_paid_until_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_subscribers_updated_at
before update on public.subscribers
for each row
execute function public.set_updated_at();

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create trigger set_renewals_updated_at
before update on public.renewals
for each row
execute function public.set_updated_at();

create index subscribers_owner_active_idx
on public.subscribers (owner_id, name)
where deleted_at is null;

create index subscriptions_owner_active_paid_until_idx
on public.subscriptions (owner_id, paid_until_date)
where deleted_at is null;

create index subscriptions_subscriber_active_idx
on public.subscriptions (subscriber_id)
where deleted_at is null;

create index renewals_owner_created_at_idx
on public.renewals (owner_id, created_at desc)
where deleted_at is null;

create index renewals_subscription_created_at_idx
on public.renewals (subscription_id, created_at desc)
where deleted_at is null;
