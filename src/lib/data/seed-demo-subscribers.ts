import { type DataModuleContext, demoOrganizationId } from './data-layer-context';
import { listSubscribers } from './subscribers.queries';
import { saveSubscriber } from './subscribers.commands';
import { saveSubscription } from './subscriptions.commands';

const demoPlans = [
  {
    facility_access: ['dragonz' as const],
    id: 'demo-plan-gimnasio',
    name: 'Gimnasio',
    price: 300,
    weekly_visit_limit: null,
  },
  {
    facility_access: ['monsters' as const],
    id: 'demo-plan-crossfit-3-dias',
    name: 'CrossFit (3 días)',
    price: 350,
    weekly_visit_limit: 3,
  },
  {
    facility_access: ['monsters' as const],
    id: 'demo-plan-crossfit-regular',
    name: 'CrossFit (Regular)',
    price: 450,
    weekly_visit_limit: null,
  },
  {
    facility_access: ['dragonz' as const, 'monsters' as const],
    id: 'demo-plan-combo',
    name: 'Combo',
    price: 600,
    weekly_visit_limit: null,
  },
];

async function seedDemoPlans(context: DataModuleContext) {
  const existingPlans = await context.db.plans.find().exec();

  if (existingPlans.length > 0) {
    return;
  }

  const now = new Date().toISOString();

  await Promise.all(
    demoPlans.map((plan) =>
      context.db.plans.insert({
        ...plan,
        _deleted: false,
        _modified: now,
        active: true,
        created_at: now,
        organization_id: context.activeOrganizationId,
        updated_at: now,
      }),
    ),
  );
}

export async function seedDemoSubscribers(context: DataModuleContext) {
  if (context.activeOrganizationId !== demoOrganizationId) {
    return;
  }

  await seedDemoPlans(context);

  const existingSubscribers = await listSubscribers(context);

  if (existingSubscribers.length > 0) {
    return;
  }

  await Promise.all([
    saveSubscriber(context, {
      id: 'demo-subscriber-1',
      name: 'Mariana Soto',
    }),
    saveSubscriber(context, {
      id: 'demo-subscriber-2',
      name: 'Carlos Perez',
    }),
    saveSubscriber(context, {
      id: 'demo-subscriber-3',
      name: 'Lucia Ramos',
    }),
  ]);

  await Promise.all([
    saveSubscription(context, {
      billing_period: 'monthly',
      id: 'demo-subscription-1',
      kind: 'gym',
      paid_until_date: '2026-07-24',
      start_date: '2026-06-24',
      subscriber_id: 'demo-subscriber-1',
    }),
    saveSubscription(context, {
      billing_period: 'weekly',
      id: 'demo-subscription-2',
      kind: 'crossfit',
      paid_until_date: '2026-07-02',
      start_date: '2026-06-25',
      subscriber_id: 'demo-subscriber-2',
    }),
    saveSubscription(context, {
      billing_period: 'monthly',
      id: 'demo-subscription-3',
      kind: 'gym',
      paid_until_date: '2026-06-25',
      start_date: '2026-05-25',
      subscriber_id: 'demo-subscriber-3',
    }),
    saveSubscription(context, {
      billing_period: 'monthly',
      id: 'demo-subscription-4',
      kind: 'crossfit',
      paid_until_date: '2026-07-25',
      start_date: '2026-06-25',
      subscriber_id: 'demo-subscriber-3',
    }),
  ]);
}
