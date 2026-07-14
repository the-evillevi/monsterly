import { Link } from 'react-router-dom';

import { StatusBadge } from '@/components/status-badge';
import { SubscriberAvatar } from '@/components/subscriber-avatar';
import { RenewDialog } from '@/components/subscriptions/renew-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { subscriberUrlSegment } from '@/lib/domain/subscriber-identity';
import type { SubscriberSummary } from '@/lib/domain/subscriber-summaries';
import type { SubscriptionDocument } from '@/lib/local-db/monsterly-db';

type SubscriberListProps = {
  emptyMessage?: string;
  subscriptionsBySubscriber: Map<string, SubscriptionDocument[]>;
  summaries: SubscriberSummary[];
};

function telHref(phoneNumber: string) {
  return `tel:${phoneNumber.replace(/[^+\d]/g, '')}`;
}

export function SubscriberList({
  emptyMessage = 'No hay suscriptores que coincidan.',
  subscriptionsBySubscriber,
  summaries,
}: SubscriberListProps) {
  if (summaries.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="grid max-w-3xl gap-3">
      {summaries.map((subscriber) => {
        const subscriptions = subscriptionsBySubscriber.get(subscriber.id) ?? [];

        return (
          <li key={subscriber.id}>
            <Card className="p-4">
              <article className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex items-center gap-3">
                  <SubscriberAvatar id={subscriber.id} name={subscriber.name} />
                  <div className="grid gap-0.5">
                    <strong className="text-foreground">{subscriber.name}</strong>
                    {subscriber.phoneNumber ? (
                      <a
                        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        href={telHref(subscriber.phoneNumber)}
                      >
                        {subscriber.phoneNumber}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2 sm:justify-items-end">
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <StatusBadge status={subscriber.status} />
                    {subscriber.plans.map((plan) => (
                      <Badge key={plan} variant="secondary">
                        {plan}
                      </Badge>
                    ))}
                  </div>
                  {subscriber.paidUntilDate ? (
                    <time
                      className="text-sm text-muted-foreground"
                      dateTime={subscriber.paidUntilDate}
                    >
                      Pagado hasta {subscriber.paidUntilLabel}
                    </time>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {subscriptions.length > 0 ? (
                      <RenewDialog subscriptions={subscriptions} />
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        aria-label={`Editar ${subscriber.name}`}
                        to={`/subscribers/${subscriberUrlSegment(subscriber)}/edit`}
                      >
                        Editar
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
