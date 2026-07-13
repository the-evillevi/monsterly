import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { PageFrame } from '@/components/page-frame';
import { SubscriberList } from '@/components/subscribers/subscriber-list';

export function SubscribersPage() {
  return (
    <PageFrame title="Subscribers" subtitle="Manage active gym and CrossFit members.">
      <div>
        <Button asChild>
          <Link to="/subscribers/new">Agregar suscriptor</Link>
        </Button>
      </div>
      <SubscriberList />
    </PageFrame>
  );
}
