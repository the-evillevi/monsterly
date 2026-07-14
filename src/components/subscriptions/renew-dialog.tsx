import { useState } from 'react';
import type { ReactNode } from 'react';

import { BillingPeriodSelect } from '@/components/subscriptions/billing-period-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useRenewSubscription } from '@/lib/data/use-subscription-commands';
import { isValidCustomDays, nextPaidUntilDate } from '@/lib/domain/billing-period';
import { formatDateOnlyLabel } from '@/lib/domain/date-only';
import { paymentMethodLabels } from '@/lib/domain/payment-method';
import { subscriptionKindLabels } from '@/lib/domain/subscription-kind';
import {
  type BillingPeriod,
  type PaymentMethod,
  paymentMethods,
  type SubscriptionDocument,
} from '@/lib/local-db/monsterly-db';

type RenewDialogProps = {
  // Preselects a subscription and skips the picker (edit-page per-card trigger).
  defaultSubscriptionId?: string;
  // The member's non-archived subscriptions; at least one.
  subscriptions: SubscriptionDocument[];
  trigger?: ReactNode;
};

function planLabel(subscription: SubscriptionDocument) {
  return subscription.plan_name ?? subscriptionKindLabels[subscription.kind];
}

export function RenewDialog({ defaultSubscriptionId, subscriptions, trigger }: RenewDialogProps) {
  const renew = useRenewSubscription();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [customDays, setCustomDays] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isRenewing, setIsRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPick = subscriptions.length > 1 && !defaultSubscriptionId;
  const selected = subscriptions.find((subscription) => subscription.id === selectedId) ?? null;

  function loadSubscription(subscription: SubscriptionDocument) {
    setSelectedId(subscription.id);
    setBillingPeriod(subscription.billing_period);
    setCustomDays(subscription.custom_days?.toString() ?? '');
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);

    if (next) {
      setError(null);
      setPaymentMethod('cash');
      const initial =
        subscriptions.find((subscription) => subscription.id === defaultSubscriptionId) ??
        (subscriptions.length === 1 ? subscriptions[0] : null);

      if (initial) {
        loadSubscription(initial);
      } else {
        setSelectedId(null);
      }
    }
  }

  const customDayCount = billingPeriod === 'custom' ? Number(customDays) : undefined;
  const needsCustomDays = billingPeriod === 'custom' && !isValidCustomDays(customDayCount);
  const newPaidUntilDate =
    selected && !needsCustomDays
      ? nextPaidUntilDate(selected.paid_until_date, billingPeriod, customDayCount)
      : null;

  async function handleConfirm() {
    if (!selected || !newPaidUntilDate) {
      return;
    }

    setError(null);
    setIsRenewing(true);

    try {
      await renew({
        billing_period: billingPeriod,
        custom_days: customDayCount,
        payment_method: paymentMethod,
        subscription_id: selected.id,
      });
      handleOpenChange(false);
    } catch (renewError) {
      console.error('Failed to renew the subscription.', renewError);
      setError('No se pudo renovar. Intenta de nuevo.');
    } finally {
      setIsRenewing(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" type="button">
            Renovar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renovar membresía</DialogTitle>
          <DialogDescription>Extiende la vigencia y registra cómo se pagó.</DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="grid gap-2" role="radiogroup" aria-label="Elige la suscripción">
            <p className="text-sm text-muted-foreground">Elige la suscripción a renovar.</p>
            {subscriptions.map((subscription) => (
              <button
                aria-checked={false}
                className="flex items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-secondary"
                key={subscription.id}
                onClick={() => loadSubscription(subscription)}
                role="radio"
                type="button"
              >
                <span className="font-medium text-foreground">{planLabel(subscription)}</span>
                <span className="text-muted-foreground">
                  Pagado hasta {formatDateOnlyLabel(subscription.paid_until_date)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {canPick ? (
              <button
                className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setSelectedId(null)}
                type="button"
              >
                ← Cambiar suscripción
              </button>
            ) : null}

            <p className="text-sm text-muted-foreground">
              {planLabel(selected)} · Pagado hasta{' '}
              <time className="text-foreground" dateTime={selected.paid_until_date}>
                {formatDateOnlyLabel(selected.paid_until_date)}
              </time>
            </p>

            <Field>
              <FieldLabel htmlFor="renew-period">Renovar por</FieldLabel>
              <BillingPeriodSelect
                id="renew-period"
                onChange={(event) => setBillingPeriod(event.target.value as BillingPeriod)}
                value={billingPeriod}
              />
            </Field>

            {billingPeriod === 'custom' ? (
              <Field>
                <FieldLabel htmlFor="renew-custom-days">Días del periodo</FieldLabel>
                <Input
                  id="renew-custom-days"
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => setCustomDays(event.target.value)}
                  type="number"
                  value={customDays}
                />
              </Field>
            ) : null}

            <Field>
              <FieldLabel>Método de pago</FieldLabel>
              <div aria-label="Método de pago" className="grid grid-cols-3 gap-2" role="radiogroup">
                {paymentMethods.map((method) => (
                  <Button
                    aria-checked={paymentMethod === method}
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    role="radio"
                    size="sm"
                    type="button"
                    variant={paymentMethod === method ? 'default' : 'outline'}
                  >
                    {paymentMethodLabels[method]}
                  </Button>
                ))}
              </div>
            </Field>

            <p className="text-sm text-muted-foreground">
              {newPaidUntilDate ? (
                <>
                  Nuevo pagado hasta:{' '}
                  <time className="font-medium text-foreground" dateTime={newPaidUntilDate}>
                    {formatDateOnlyLabel(newPaidUntilDate)}
                  </time>
                </>
              ) : (
                'Ingresa un número de días de al menos 1.'
              )}
            </p>

            <FieldError>{error}</FieldError>
          </div>
        )}

        <DialogFooter>
          <Button
            disabled={!selected || isRenewing || !newPaidUntilDate}
            onClick={handleConfirm}
            type="button"
          >
            Confirmar renovación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
