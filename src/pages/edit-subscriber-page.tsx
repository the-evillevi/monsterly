import { useNavigate, useParams } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import { ResourceNotFound } from '@/components/resource-not-found';
import { ArchiveSubscriberButton } from '@/components/subscribers/archive-subscriber-button';
import { SubscriptionListSection } from '@/components/subscriptions/subscription-list-section';
import {
  SubscriberForm,
  type SubscriberFormValues,
} from '@/components/subscribers/subscriber-form';
import { useSubscriber } from '@/lib/data/use-subscriber-summaries';
import { useArchiveSubscriber, useSaveSubscriber } from '@/lib/data/use-subscriber-commands';

export function EditSubscriberPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const save = useSaveSubscriber();
  const archive = useArchiveSubscriber();
  const { isLoading, subscriber } = useSubscriber(id);

  async function handleSubmit(values: SubscriberFormValues) {
    await save({ id, ...values });
    navigate('/subscribers');
  }

  async function handleArchive() {
    await archive(id);
    navigate('/subscribers');
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
          <SubscriberForm
            defaultValues={{
              gender: subscriber.gender,
              name: subscriber.name,
              phone_number: subscriber.phone_number ?? undefined,
            }}
            footer={<ArchiveSubscriberButton onArchive={handleArchive} />}
            onSubmit={handleSubmit}
            submitLabel="Guardar"
          />
          <SubscriptionListSection subscriberId={id} subscriptions={subscriber.subscriptions} />
        </div>
      ) : null}
    </PageFrame>
  );
}
