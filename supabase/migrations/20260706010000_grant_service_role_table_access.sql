-- The service role bypasses RLS but still needs table-level DML grants, which
-- the core-tables migration only gave to `authenticated`. Grant them so the
-- import script and future server-side tooling can read and write directly.
grant select, insert, update, delete on public.organizations to service_role;
grant select, insert, update, delete on public.organization_members to service_role;
grant select, insert, update, delete on public.subscribers to service_role;
grant select, insert, update, delete on public.subscriptions to service_role;
grant select, insert, update, delete on public.renewals to service_role;
