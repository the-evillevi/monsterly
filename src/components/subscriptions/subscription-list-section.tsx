import { Link } from 'react-router-dom';

import { RenewSubscriptionControl } from '@/components/subscriptions/renew-subscription-control';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { billingPeriodLabels } from '@/lib/domain/billing-period';
import { formatDateOnlyLabel } from '@/lib/domain/date-only';
import { subscriptionKindLabels } from '@/lib/domain/subscription-kind';
import type { SubscriptionDocument } from '@/lib/local-db/monsterly-db';

type SubscriptionListSectionProps = {
  subscriberId: string;
  subscriptions: SubscriptionDocument[];
};

function formatPeriodLabel(subscription: SubscriptionDocument) {
  if (subscription.billing_period === 'custom' && subscription.custom_days) {
    return `${billingPeriodLabels.custom} (${subscription.custom_days} días)`;
  }

  return billingPeriodLabels[subscription.billing_period];
}

export function SubscriptionListSection({
  subscriberId,
  subscriptions,
}: SubscriptionListSectionProps) {
  return (
    <section aria-label="Suscripciones" className="grid w-full max-w-sm gap-4 border-t pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">Suscripciones</h2>
        <Button asChild size="sm">
          <Link to={`/subscribers/${subscriberId}/subscriptions/new`}>Agregar suscripción</Link>
        </Button>
      </div>
      {subscriptions.length === 0 ? (
        <p className="text-muted-foreground">Sin suscripciones.</p>
      ) : (
        <ul className="grid gap-3">
          {subscriptions.map((subscription) => (
            <li key={subscription.id}>
              <Card className="grid gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{subscriptionKindLabels[subscription.kind]}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatPeriodLabel(subscription)}
                  </span>
                  <Button asChild className="ml-auto" size="sm" variant="ghost">
                    <Link
                      aria-label={`Editar suscripción ${subscriptionKindLabels[subscription.kind]} pagada hasta ${formatDateOnlyLabel(subscription.paid_until_date)}`}
                      to={`/subscribers/${subscriberId}/subscriptions/${subscription.id}/edit`}
                    >
                      Editar
                    </Link>
                  </Button>
                </div>
                <dl className="grid gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Inicio</dt>
                    <dd>
                      <time dateTime={subscription.start_date}>
                        {formatDateOnlyLabel(subscription.start_date)}
                      </time>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Pagado hasta</dt>
                    <dd>
                      <time dateTime={subscription.paid_until_date}>
                        {formatDateOnlyLabel(subscription.paid_until_date)}
                      </time>
                    </dd>
                  </div>
                </dl>
                <RenewSubscriptionControl subscription={subscription} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
