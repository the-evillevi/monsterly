import type { MonsterlyRepositories } from './rxdb-repositories';

export async function seedDemoSubscribers(repositories: MonsterlyRepositories) {
  const existingSubscribers = await repositories.subscribers.list();

  if (existingSubscribers.length > 0) {
    return;
  }

  await repositories.subscribers.save({
    id: 'demo-subscriber-1',
    name: 'Mariana Soto',
  });
  await repositories.subscribers.save({
    id: 'demo-subscriber-2',
    name: 'Carlos Perez',
  });
  await repositories.subscribers.save({
    id: 'demo-subscriber-3',
    name: 'Lucia Ramos',
  });

  await repositories.subscriptions.save({
    billing_period: 'monthly',
    id: 'demo-subscription-1',
    kind: 'gym',
    paid_until_date: '2026-07-24',
    start_date: '2026-06-24',
    subscriber_id: 'demo-subscriber-1',
  });
  await repositories.subscriptions.save({
    billing_period: 'weekly',
    id: 'demo-subscription-2',
    kind: 'crossfit',
    paid_until_date: '2026-07-02',
    start_date: '2026-06-25',
    subscriber_id: 'demo-subscriber-2',
  });
  await repositories.subscriptions.save({
    billing_period: 'monthly',
    id: 'demo-subscription-3',
    kind: 'gym',
    paid_until_date: '2026-06-25',
    start_date: '2026-05-25',
    subscriber_id: 'demo-subscriber-3',
  });
  await repositories.subscriptions.save({
    billing_period: 'monthly',
    id: 'demo-subscription-4',
    kind: 'crossfit',
    paid_until_date: '2026-07-25',
    start_date: '2026-06-25',
    subscriber_id: 'demo-subscriber-3',
  });
}
