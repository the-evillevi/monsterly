import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useSubscriberSummaries } from '@/lib/data/use-subscriber-summaries';
import type { SubscriptionStatus } from '@/lib/domain/subscriber-summaries';

type SubscriberListProps = {
  filterStatus?: SubscriptionStatus;
};

function telHref(phoneNumber: string) {
  return `tel:${phoneNumber.replace(/[^+\d]/g, '')}`;
}

export function SubscriberList({ filterStatus }: SubscriberListProps) {
  const { isLoading, summaries } = useSubscriberSummaries(filterStatus);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading subscribers...</p>;
  }

  return (
    <div className="grid max-w-3xl gap-3">
      {summaries.map((subscriber) => (
        <Card className="p-4" key={subscriber.id}>
          <article className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="grid gap-1 justify-items-start">
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
            <div className="grid gap-2 sm:justify-items-end">
              <Badge variant="outline">{subscriber.status}</Badge>
              {subscriber.plans.length > 0 ? (
                <div className="flex gap-1">
                  {subscriber.plans.map((plan) => (
                    <Badge key={plan} variant="secondary">
                      {plan}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {subscriber.paidUntilDate ? (
                <time className="text-sm text-muted-foreground" dateTime={subscriber.paidUntilDate}>
                  Paid until {subscriber.paidUntilLabel}
                </time>
              ) : null}
            </div>
          </article>
        </Card>
      ))}
    </div>
  );
}
