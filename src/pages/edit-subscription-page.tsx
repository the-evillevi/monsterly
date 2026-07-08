import { useNavigate, useParams } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import { ResourceNotFound } from '@/components/resource-not-found';
import {
  SubscriptionForm,
  type SubscriptionFormValues,
} from '@/components/subscriptions/subscription-form';
import { useSaveSubscription } from '@/lib/data/use-subscription-commands';
import { useSubscriber } from '@/lib/data/use-subscriber-summaries';

export function EditSubscriptionPage() {
  const { id = '', subscriptionId = '' } = useParams();
  const navigate = useNavigate();
  const save = useSaveSubscription();
  const { isLoading, subscriber } = useSubscriber(id);
  const subscription =
    subscriber?.subscriptions.find((candidate) => candidate.id === subscriptionId) ?? null;

  async function handleSubmit(values: SubscriptionFormValues) {
    await save({ id: subscriptionId, subscriber_id: id, ...values });
    navigate(`/subscribers/${id}/edit`);
  }

  return (
    <PageFrame title="Editar suscripción" subtitle="Actualiza el plan y las fechas de pago.">
      {isLoading ? <p className="text-muted-foreground">Cargando suscripción...</p> : null}
      {!isLoading && !subscription ? (
        <ResourceNotFound
          backLabel="Volver al suscriptor"
          backTo={`/subscribers/${id}/edit`}
          message="Suscripción no encontrada."
        />
      ) : null}
      {!isLoading && subscriber && subscription ? (
        <div className="grid gap-4">
          <p className="text-muted-foreground">
            Suscripción de <strong className="text-foreground">{subscriber.name}</strong>.
          </p>
          <SubscriptionForm
            cancelTo={`/subscribers/${id}/edit`}
            defaultValues={{
              billing_period: subscription.billing_period,
              custom_days: subscription.custom_days ?? undefined,
              kind: subscription.kind,
              paid_until_date: subscription.paid_until_date,
              start_date: subscription.start_date,
            }}
            onSubmit={handleSubmit}
            submitLabel="Guardar"
          />
        </div>
      ) : null}
    </PageFrame>
  );
}
