-- EVL-93: record how a manual renewal was paid at the front desk. Nullable —
-- renewal rows written before this feature carry no method.

alter table public.renewals
add column if not exists payment_method text;

alter table public.renewals
add constraint renewals_payment_method_valid check (
  payment_method is null or payment_method in ('cash', 'card', 'transfer')
);
