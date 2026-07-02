import { type DataModuleContext, demoOrganizationId } from './data-layer-context';
import { listSubscribers } from './subscribers.queries';
import { saveSubscriber } from './subscribers.commands';
import { saveSubscription } from './subscriptions.commands';

export async function seedDemoSubscribers(context: DataModuleContext) {
  if (context.activeOrganizationId !== demoOrganizationId) {
    return;
  }

  const existingSubscribers = await listSubscribers(context);

  if (existingSubscribers.length > 0) {
    return;
  }

  await saveSubscriber(context, {
    id: 'demo-subscriber-1',
    name: 'Mariana Soto',
  });
  await saveSubscriber(context, {
    id: 'demo-subscriber-2',
    name: 'Carlos Perez',
  });
  await saveSubscriber(context, {
    id: 'demo-subscriber-3',
    name: 'Lucia Ramos',
  });

  await saveSubscription(context, {
    billing_period: 'monthly',
    id: 'demo-subscription-1',
    kind: 'gym',
    paid_until_date: '2026-07-24',
    start_date: '2026-06-24',
    subscriber_id: 'demo-subscriber-1',
  });
  await saveSubscription(context, {
    billing_period: 'weekly',
    id: 'demo-subscription-2',
    kind: 'crossfit',
    paid_until_date: '2026-07-02',
    start_date: '2026-06-25',
    subscriber_id: 'demo-subscriber-2',
  });
  await saveSubscription(context, {
    billing_period: 'monthly',
    id: 'demo-subscription-3',
    kind: 'gym',
    paid_until_date: '2026-06-25',
    start_date: '2026-05-25',
    subscriber_id: 'demo-subscriber-3',
  });
  await saveSubscription(context, {
    billing_period: 'monthly',
    id: 'demo-subscription-4',
    kind: 'crossfit',
    paid_until_date: '2026-07-25',
    start_date: '2026-06-25',
    subscriber_id: 'demo-subscriber-3',
  });
}
