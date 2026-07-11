import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import { ResourceNotFound } from '@/components/resource-not-found';
import {
  SubscriptionForm,
  type SubscriptionFormValues,
} from '@/components/subscriptions/subscription-form';
import { useSaveSubscription } from '@/lib/data/use-subscription-commands';
import { useSubscriber } from '@/lib/data/use-subscriber-summaries';
import { formatFullName, newEntityId } from '@/lib/domain/subscriber-identity';

export function NewSubscriptionPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const save = useSaveSubscription();
  const { isLoading, subscriber } = useSubscriber(slug);

  async function handleSubmit(values: SubscriptionFormValues) {
    if (!subscriber) {
      return;
    }

    // The FK binds to the immutable id, never to the slug route param.
    await save({ id: newEntityId(), subscriber_id: subscriber.id, ...values });
    navigate(`/subscribers/${slug}/edit`);
  }

  // Old id-based URLs still resolve; send them to the canonical slug route.
  if (subscriber?.slug && subscriber.slug !== slug) {
    return <Navigate replace to={`/subscribers/${subscriber.slug}/subscriptions/new`} />;
  }

  return (
    <PageFrame title="Nueva suscripción" subtitle="Registra el plan y las fechas de pago.">
      {isLoading ? <p className="text-muted-foreground">Cargando suscriptor...</p> : null}
      {!isLoading && !subscriber ? (
        <ResourceNotFound
          backLabel="Volver a suscriptores"
          backTo="/subscribers"
          message="Suscriptor no encontrado."
        />
      ) : null}
      {!isLoading && subscriber ? (
        <div className="grid gap-4">
          <p className="text-muted-foreground">
            Suscripción para{' '}
            <strong className="text-foreground">{formatFullName(subscriber)}</strong>.
          </p>
          <SubscriptionForm
            cancelTo={`/subscribers/${slug}/edit`}
            onSubmit={handleSubmit}
            submitLabel="Guardar"
          />
        </div>
      ) : null}
    </PageFrame>
  );
}
