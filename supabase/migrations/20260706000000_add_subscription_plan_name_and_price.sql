-- Business data carried over from the operator's spreadsheet that had no home
-- in the original schema: the human-facing plan name and the amount paid.
alter table public.subscriptions
  add column if not exists plan_name text;

alter table public.subscriptions
  add column if not exists price numeric;

-- Price is optional, but when present it must be non-negative.
alter table public.subscriptions
  drop constraint if exists subscriptions_price_non_negative;

alter table public.subscriptions
  add constraint subscriptions_price_non_negative check (price is null or price >= 0);
