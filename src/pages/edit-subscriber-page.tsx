import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import { ArchiveConfirmButton } from '@/components/archive-confirm-button';
import { ResourceNotFound } from '@/components/resource-not-found';
import { SubscriptionListSection } from '@/components/subscriptions/subscription-list-section';
import {
  SubscriberForm,
  type SubscriberFormValues,
} from '@/components/subscribers/subscriber-form';
import { useSubscriber } from '@/lib/data/use-subscriber-summaries';
import { useArchiveSubscriber, useSaveSubscriber } from '@/lib/data/use-subscriber-commands';
import { subscriberUrlSegment } from '@/lib/domain/subscriber-identity';

export function EditSubscriberPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const save = useSaveSubscriber();
  const archive = useArchiveSubscriber();
  const { isLoading, subscriber } = useSubscriber(slug);

  async function handleSubmit(values: SubscriberFormValues) {
    await save({ id: subscriber?.id, ...values });
    navigate('/subscribers');
  }

  async function handleArchive() {
    if (subscriber) {
      await archive(subscriber.id);
      navigate('/subscribers');
    }
  }

  // Old id-based URLs still resolve; send them to the canonical slug route.
  if (subscriber?.slug && subscriber.slug !== slug) {
    return <Navigate replace to={`/subscribers/${subscriber.slug}/edit`} />;
  }

  return (
    <PageFrame title="Editar suscriptor" subtitle="Actualiza los datos del miembro.">
      {isLoading ? <p className="text-muted-foreground">Cargando suscriptor...</p> : null}
      {!isLoading && !subscriber ? (
        <ResourceNotFound
          backLabel="Volver a suscriptores"
          backTo="/subscribers"
          message="Suscriptor no encontrado."
        />
      ) : null}
      {!isLoading && subscriber ? (
        <div className="grid gap-6">
          {subscriber.check_in_code ? (
            <p className="text-sm text-muted-foreground">
              Código de acceso:{' '}
              <strong className="text-foreground">{subscriber.check_in_code}</strong>
            </p>
          ) : null}
          <SubscriberForm
            defaultValues={{
              gender: subscriber.gender,
              maternal_last_name: subscriber.maternal_last_name ?? undefined,
              name: subscriber.name,
              paternal_last_name: subscriber.paternal_last_name ?? undefined,
              phone_number: subscriber.phone_number ?? undefined,
            }}
            footer={
              <ArchiveConfirmButton
                confirmPrompt="¿Archivar este suscriptor?"
                label="Archivar suscriptor"
                onArchive={handleArchive}
              />
            }
            onSubmit={handleSubmit}
            submitLabel="Guardar"
          />
          <SubscriptionListSection
            subscriberSlug={subscriberUrlSegment(subscriber)}
            subscriptions={subscriber.subscriptions}
          />
        </div>
      ) : null}
    </PageFrame>
  );
}
