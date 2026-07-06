-- The service role bypasses RLS but still needs table-level privileges, and
-- this project's default privileges never granted it DML on these tables
-- (only authenticated got grants in 20260630220000). Trusted server-side
-- tooling such as scripts/import-subscribers.mjs relies on these grants.
grant usage on schema public to service_role;
grant select on public.organizations to service_role;
grant select, insert, update on public.subscribers to service_role;
grant select, insert, update on public.subscriptions to service_role;
grant select, insert, update on public.renewals to service_role;
