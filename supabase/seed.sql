-- Local development seed data: two organizations with five subscribers each.
-- Use one of the organization ids as VITE_MONSTERLY_ORGANIZATION_ID to test
-- RxDB replication scoped to that organization.
--
-- LOCAL DEV ONLY: seed.sql runs exclusively on `supabase db reset` against the
-- local stack, never on a linked remote project. The anon grants and policies
-- below let RxDB replication run without auth while authentication is out of
-- scope (EVL-82); production access stays restricted to authenticated
-- organization members by the migrations.

grant usage on schema public to anon;
grant select, insert, update on public.subscribers to anon;
grant select, insert, update on public.subscriptions to anon;
grant select, insert, update on public.renewals to anon;

drop policy if exists "Local dev anon can read subscribers" on public.subscribers;
create policy "Local dev anon can read subscribers"
on public.subscribers for select to anon using (true);

drop policy if exists "Local dev anon can write subscribers" on public.subscribers;
create policy "Local dev anon can write subscribers"
on public.subscribers for insert to anon with check (true);

drop policy if exists "Local dev anon can update subscribers" on public.subscribers;
create policy "Local dev anon can update subscribers"
on public.subscribers for update to anon using (true) with check (true);

drop policy if exists "Local dev anon can read subscriptions" on public.subscriptions;
create policy "Local dev anon can read subscriptions"
on public.subscriptions for select to anon using (true);

drop policy if exists "Local dev anon can write subscriptions" on public.subscriptions;
create policy "Local dev anon can write subscriptions"
on public.subscriptions for insert to anon with check (true);

drop policy if exists "Local dev anon can update subscriptions" on public.subscriptions;
create policy "Local dev anon can update subscriptions"
on public.subscriptions for update to anon using (true) with check (true);

drop policy if exists "Local dev anon can read renewals" on public.renewals;
create policy "Local dev anon can read renewals"
on public.renewals for select to anon using (true);

drop policy if exists "Local dev anon can write renewals" on public.renewals;
create policy "Local dev anon can write renewals"
on public.renewals for insert to anon with check (true);

drop policy if exists "Local dev anon can update renewals" on public.renewals;
create policy "Local dev anon can update renewals"
on public.renewals for update to anon using (true) with check (true);

insert into public.organizations (id, name)
values
  ('11111111-1111-4111-8111-111111111111', 'Gimnasio Norte'),
  ('22222222-2222-4222-8222-222222222222', 'Box CrossFit Sur')
on conflict (id) do nothing;

insert into public.subscribers (id, organization_id, name, gender, phone_number)
values
  ('norte-subscriber-1', '11111111-1111-4111-8111-111111111111', 'Mariana Soto', 'female', '+52 55 1111 0001'),
  ('norte-subscriber-2', '11111111-1111-4111-8111-111111111111', 'Carlos Perez', 'male', '+52 55 1111 0002'),
  ('norte-subscriber-3', '11111111-1111-4111-8111-111111111111', 'Lucia Ramos', 'female', '+52 55 1111 0003'),
  ('norte-subscriber-4', '11111111-1111-4111-8111-111111111111', 'Andres Fuentes', 'male', '+52 55 1111 0004'),
  ('norte-subscriber-5', '11111111-1111-4111-8111-111111111111', 'Sofia Delgado', 'female', '+52 55 1111 0005'),
  ('sur-subscriber-1', '22222222-2222-4222-8222-222222222222', 'Valeria Cruz', 'female', '+52 55 2222 0001'),
  ('sur-subscriber-2', '22222222-2222-4222-8222-222222222222', 'Diego Mendoza', 'male', '+52 55 2222 0002'),
  ('sur-subscriber-3', '22222222-2222-4222-8222-222222222222', 'Fernanda Lopez', 'female', '+52 55 2222 0003'),
  ('sur-subscriber-4', '22222222-2222-4222-8222-222222222222', 'Rodrigo Ibarra', 'male', '+52 55 2222 0004'),
  ('sur-subscriber-5', '22222222-2222-4222-8222-222222222222', 'Camila Ortega', 'non_binary', '+52 55 2222 0005')
on conflict (id) do nothing;
