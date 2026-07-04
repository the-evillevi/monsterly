import { Link, useNavigate, useParams } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import {
  SubscriberForm,
  type SubscriberFormValues,
} from '@/components/subscribers/subscriber-form';
import { Button } from '@/components/ui/button';
import { useSubscriber } from '@/lib/data/use-subscriber-summaries';
import { useSaveSubscriber } from '@/lib/data/use-subscriber-commands';

export function EditSubscriberPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const save = useSaveSubscriber();
  const { isLoading, subscriber } = useSubscriber(id);

  async function handleSubmit(values: SubscriberFormValues) {
    await save({ id, ...values });
    navigate('/subscribers');
  }

  return (
    <PageFrame title="Editar suscriptor" subtitle="Actualiza los datos del miembro.">
      {isLoading ? <p className="text-muted-foreground">Cargando suscriptor...</p> : null}
      {!isLoading && !subscriber ? (
        <div className="grid max-w-md gap-4 justify-items-start">
          <p className="text-muted-foreground">Suscriptor no encontrado.</p>
          <Button asChild variant="outline">
            <Link to="/subscribers">Volver a suscriptores</Link>
          </Button>
        </div>
      ) : null}
      {!isLoading && subscriber ? (
        <SubscriberForm
          defaultValues={{
            gender: subscriber.gender,
            name: subscriber.name,
            phone_number: subscriber.phone_number ?? undefined,
          }}
          onSubmit={handleSubmit}
          submitLabel="Guardar"
        />
      ) : null}
    </PageFrame>
  );
}
