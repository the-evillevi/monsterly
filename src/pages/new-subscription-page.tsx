import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import { ResourceNotFound } from '@/components/resource-not-found';
import {
  PlanSubscriptionForm,
  type PlanSubscriptionFormValues,
} from '@/components/subscriptions/plan-subscription-form';
import { useActivePlans } from '@/lib/data/use-plans';
import { useSaveSubscription } from '@/lib/data/use-subscription-commands';
import { useSubscriber } from '@/lib/data/use-subscriber-summaries';
import { formatFullName, newEntityId } from '@/lib/domain/subscriber-identity';

export function NewSubscriptionPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const save = useSaveSubscription();
  const { isLoading, subscriber } = useSubscriber(slug);
  const { isLoading: plansLoading, plans } = useActivePlans();

  async function handleSubmit(values: PlanSubscriptionFormValues) {
    if (!subscriber) {
      return;
    }

    // The alta only offers catalog mensualidades; the FK binds to the
    // immutable subscriber id, never to the slug route param.
    await save({
      billing_period: 'monthly',
      id: newEntityId(),
      paid_until_date: values.paid_until_date,
      plan_id: values.plan_id,
      start_date: values.start_date,
      subscriber_id: subscriber.id,
    });
    navigate(`/subscribers/${slug}/edit`);
  }

  // Old id-based URLs still resolve; send them to the canonical slug route.
  if (subscriber?.slug && subscriber.slug !== slug) {
    return <Navigate replace to={`/subscribers/${subscriber.slug}/subscriptions/new`} />;
  }

  const loading = isLoading || plansLoading;

  return (
    <PageFrame title="Nueva suscripción" subtitle="Elige el plan y las fechas de pago.">
      {loading ? <p className="text-muted-foreground">Cargando suscriptor...</p> : null}
      {!loading && !subscriber ? (
        <ResourceNotFound
          backLabel="Volver a suscriptores"
          backTo="/subscribers"
          message="Suscriptor no encontrado."
        />
      ) : null}
      {!loading && subscriber && plans.length === 0 ? (
        <p className="text-muted-foreground">No hay planes configurados para esta organización.</p>
      ) : null}
      {!loading && subscriber && plans.length > 0 ? (
        <div className="grid gap-4">
          <p className="text-muted-foreground">
            Suscripción para{' '}
            <strong className="text-foreground">{formatFullName(subscriber)}</strong>.
          </p>
          <PlanSubscriptionForm
            cancelTo={`/subscribers/${slug}/edit`}
            onSubmit={handleSubmit}
            plans={plans}
            submitLabel="Guardar"
          />
        </div>
      ) : null}
    </PageFrame>
  );
}
