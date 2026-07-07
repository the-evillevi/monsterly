import { Link, useNavigate, useParams } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import {
  SubscriptionForm,
  type SubscriptionFormValues,
} from '@/components/subscriptions/subscription-form';
import { Button } from '@/components/ui/button';
import { useSaveSubscription } from '@/lib/data/use-subscription-commands';
import { useSubscriber } from '@/lib/data/use-subscriber-summaries';

export function NewSubscriptionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const save = useSaveSubscription();
  const { isLoading, subscriber } = useSubscriber(id);

  async function handleSubmit(values: SubscriptionFormValues) {
    await save({ id: crypto.randomUUID(), subscriber_id: id, ...values });
    navigate(`/subscribers/${id}/edit`);
  }

  return (
    <PageFrame title="Nueva suscripción" subtitle="Registra el plan y las fechas de pago.">
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
        <div className="grid gap-4">
          <p className="text-muted-foreground">
            Suscripción para <strong className="text-foreground">{subscriber.name}</strong>.
          </p>
          <SubscriptionForm
            cancelTo={`/subscribers/${id}/edit`}
            onSubmit={handleSubmit}
            submitLabel="Guardar"
          />
        </div>
      ) : null}
    </PageFrame>
  );
}
