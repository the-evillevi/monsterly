alter table public.subscriptions
drop constraint subscriptions_subscriber_organization_fkey;

alter table public.renewals
drop constraint renewals_subscription_organization_fkey;

alter table public.subscribers
alter column id drop default;

alter table public.subscribers
alter column id type text using id::text;

alter table public.subscribers
alter column id set default gen_random_uuid()::text;

alter table public.subscriptions
alter column id drop default;

alter table public.subscriptions
alter column id type text using id::text;

alter table public.subscriptions
alter column id set default gen_random_uuid()::text;

alter table public.subscriptions
alter column subscriber_id type text using subscriber_id::text;

alter table public.renewals
alter column id drop default;

alter table public.renewals
alter column id type text using id::text;

alter table public.renewals
alter column id set default gen_random_uuid()::text;

alter table public.renewals
alter column subscription_id type text using subscription_id::text;

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

alter publication supabase_realtime
add table public.subscribers, public.subscriptions, public.renewals;
