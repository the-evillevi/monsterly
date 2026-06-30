alter table public.subscriptions
drop constraint if exists subscriptions_subscriber_id_fkey;

alter table public.renewals
drop constraint if exists renewals_subscription_id_fkey;

alter table public.subscribers
add constraint subscribers_id_owner_id_key unique (id, owner_id);

alter table public.subscriptions
add constraint subscriptions_id_owner_id_key unique (id, owner_id);

alter table public.subscriptions
add constraint subscriptions_subscriber_owner_fkey
foreign key (subscriber_id, owner_id)
references public.subscribers (id, owner_id)
on delete cascade;

alter table public.renewals
add constraint renewals_subscription_owner_fkey
foreign key (subscription_id, owner_id)
references public.subscriptions (id, owner_id)
on delete cascade;
