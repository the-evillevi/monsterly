import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { ArchiveConfirmButton } from '@/components/archive-confirm-button';
import { PageFrame } from '@/components/page-frame';
import { ResourceNotFound } from '@/components/resource-not-found';
import {
  SubscriptionForm,
  type SubscriptionFormValues,
} from '@/components/subscriptions/subscription-form';
import { useArchiveSubscription, useSaveSubscription } from '@/lib/data/use-subscription-commands';
import { useSubscriber } from '@/lib/data/use-subscriber-summaries';
import { formatFullName } from '@/lib/domain/subscriber-identity';

export function EditSubscriptionPage() {
  const { slug = '', subscriptionId = '' } = useParams();
  const navigate = useNavigate();
  const save = useSaveSubscription();
  const archive = useArchiveSubscription();
  const { isLoading, subscriber } = useSubscriber(slug);
  const subscription =
    subscriber?.subscriptions.find((candidate) => candidate.id === subscriptionId) ?? null;

  async function handleSubmit(values: SubscriptionFormValues) {
    if (!subscriber) {
      return;
    }

    // The FK binds to the immutable id, never to the slug route param.
    await save({ id: subscriptionId, subscriber_id: subscriber.id, ...values });
    navigate(`/subscribers/${slug}/edit`);
  }

  async function handleArchive() {
    await archive(subscriptionId);
    navigate(`/subscribers/${slug}/edit`);
  }

  // Old id-based URLs still resolve; send them to the canonical slug route.
  if (subscriber?.slug && subscriber.slug !== slug) {
    return (
      <Navigate
        replace
        to={`/subscribers/${subscriber.slug}/subscriptions/${subscriptionId}/edit`}
      />
    );
  }

  return (
    <PageFrame title="Editar suscripción" subtitle="Actualiza el plan y las fechas de pago.">
      {isLoading ? <p className="text-muted-foreground">Cargando suscripción...</p> : null}
      {!isLoading && !subscription ? (
        <ResourceNotFound
          backLabel="Volver al suscriptor"
          backTo={`/subscribers/${slug}/edit`}
          message="Suscripción no encontrada."
        />
      ) : null}
      {!isLoading && subscriber && subscription ? (
        <div className="grid gap-4">
          <p className="text-muted-foreground">
            Suscripción de <strong className="text-foreground">{formatFullName(subscriber)}</strong>
            .
          </p>
          <SubscriptionForm
            cancelTo={`/subscribers/${slug}/edit`}
            defaultValues={{
              billing_period: subscription.billing_period,
              custom_days: subscription.custom_days ?? undefined,
              kind: subscription.kind,
              paid_until_date: subscription.paid_until_date,
              start_date: subscription.start_date,
            }}
            footer={
              <ArchiveConfirmButton
                confirmPrompt="¿Archivar esta suscripción?"
                label="Archivar suscripción"
                onArchive={handleArchive}
              />
            }
            onSubmit={handleSubmit}
            submitLabel="Guardar"
          />
        </div>
      ) : null}
    </PageFrame>
  );
}
