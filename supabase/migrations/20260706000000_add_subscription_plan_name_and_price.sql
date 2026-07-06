alter table public.subscriptions
add column if not exists plan_name text,
add column if not exists price numeric(10, 2);

alter table public.subscriptions
add constraint subscriptions_price_non_negative check (price is null or price >= 0);
