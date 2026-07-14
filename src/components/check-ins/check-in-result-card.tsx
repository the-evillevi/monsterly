import { SubscriberAvatar } from '@/components/subscriber-avatar';
import { RenewDialog } from '@/components/subscriptions/renew-dialog';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/domain/check-ins';
import { formatDateOnlyLabel } from '@/lib/domain/date-only';
import type { SubscriberSummary } from '@/lib/domain/subscriber-summaries';
import type { SubscriptionDocument } from '@/lib/local-db/monsterly-db';
import { cn } from '@/lib/utils';

export type CheckInOutcome =
  | {
      checkedInAt: string;
      duplicate: boolean;
      kind: 'recorded';
      subscriberSnapshot: SubscriberSummary;
      subscriberId: string;
    }
  | { kind: 'unknown'; query: string }
  | { kind: 'error'; message: string };

type ToneStyle = {
  card: string;
  headline: string;
};

// Filled backgrounds so the door state reads across the room. Vencido is the
// high-contrast block warning that tells staff to stop and follow up.
const toneStyles: Record<string, ToneStyle> = {
  success: {
    card: 'border-success/40 bg-success/10',
    headline: 'text-success',
  },
  warning: {
    card: 'border-warning/50 bg-warning/15',
    headline: 'text-warning',
  },
  destructive: {
    card: 'border-transparent bg-destructive text-destructive-foreground',
    headline: 'text-destructive-foreground',
  },
  muted: {
    card: 'border-border bg-muted',
    headline: 'text-foreground',
  },
};

type CheckInResultCardProps = {
  outcome: CheckInOutcome;
  subscriber?: SubscriberSummary;
  subscriptions?: SubscriptionDocument[];
};

export function CheckInResultCard({
  outcome,
  subscriber,
  subscriptions = [],
}: CheckInResultCardProps) {
  if (outcome.kind === 'error') {
    return (
      <div
        className="grid gap-1 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center"
        role="alert"
      >
        <p className="text-lg font-bold text-destructive">No se pudo registrar la visita</p>
        <p className="text-sm text-muted-foreground">{outcome.message}</p>
      </div>
    );
  }

  if (outcome.kind === 'unknown') {
    return (
      <div
        className={cn(
          'grid gap-1 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center',
        )}
        role="status"
      >
        <p className="text-lg font-bold text-destructive">Miembro no encontrado</p>
        <p className="text-sm text-muted-foreground">
          Revisa la búsqueda <strong className="text-foreground">{outcome.query}</strong> e
          inténtalo de nuevo.
        </p>
      </div>
    );
  }

  if (!subscriber) {
    return (
      <div
        className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center"
        role="alert"
      >
        <p className="text-sm text-destructive">No se encontró al miembro registrado.</p>
      </div>
    );
  }

  const { checkedInAt, duplicate } = outcome;
  const { headline, message, tone } = describeStatus(subscriber.status, subscriber);
  const style = toneStyles[tone];

  return (
    <div className={cn('grid gap-4 rounded-xl border p-6', style.card)} role="status">
      <div className="flex items-center gap-4">
        <SubscriberAvatar
          className="size-14 text-lg"
          id={subscriber.id}
          {...subscriber.nameParts}
        />
        <div className="grid min-w-0 gap-0.5">
          <p className={cn('text-xl font-black leading-tight', style.headline)}>{headline}</p>
          <p className="truncate text-lg font-semibold">{subscriber.name}</p>
        </div>
      </div>
      <p className="text-sm">{message}</p>
      {duplicate ? (
        <p className="text-sm font-medium opacity-80">
          Ya registrado {formatRelativeTime(checkedInAt)}.
        </p>
      ) : null}
      {subscriber.status === 'Por vencer' && subscriptions.length > 0 ? (
        <RenewDialog
          subscriptions={subscriptions}
          trigger={
            <Button className="w-fit" size="sm" type="button" variant="outline">
              Renovar
            </Button>
          }
        />
      ) : null}
    </div>
  );
}

function describeStatus(status: string, summary?: SubscriberSummary) {
  const paidUntil = summary?.paidUntilDate ? formatDateOnlyLabel(summary.paidUntilDate) : null;

  if (status === 'Al corriente') {
    return {
      headline: 'Acceso registrado',
      message: paidUntil
        ? `Membresía al corriente hasta el ${paidUntil}.`
        : 'Membresía al corriente.',
      tone: 'success',
    };
  }

  if (status === 'Por vencer') {
    return {
      headline: 'Por vencer',
      message: paidUntil
        ? `La membresía vence el ${paidUntil}. Recuérdale renovar.`
        : 'La membresía está por vencer. Recuérdale renovar.',
      tone: 'warning',
    };
  }

  if (status === 'Vencido') {
    return {
      headline: 'Membresía vencida',
      message: paidUntil
        ? `Vencida desde el ${paidUntil}. Pídele renovar antes de entrenar.`
        : 'Membresía vencida. Pídele renovar antes de entrenar.',
      tone: 'destructive',
    };
  }

  return {
    headline: 'Sin suscripción activa',
    message: 'Este miembro no tiene una suscripción registrada.',
    tone: 'muted',
  };
}
