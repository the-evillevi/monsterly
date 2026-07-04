import { useNavigate } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import {
  SubscriberForm,
  type SubscriberFormValues,
} from '@/components/subscribers/subscriber-form';
import { useSaveSubscriber } from '@/lib/data/use-subscriber-commands';

export function NewSubscriberPage() {
  const navigate = useNavigate();
  const save = useSaveSubscriber();

  async function handleSubmit(values: SubscriberFormValues) {
    await save(values);
    navigate('/subscribers');
  }

  return (
    <PageFrame title="Nuevo suscriptor" subtitle="Agrega un miembro a tu gimnasio o box.">
      <SubscriberForm onSubmit={handleSubmit} submitLabel="Guardar" />
    </PageFrame>
  );
}
