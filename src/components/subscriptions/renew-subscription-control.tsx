import { useState } from 'react';

import { BillingPeriodSelect } from '@/components/subscriptions/billing-period-select';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { isValidCustomDays, nextPaidUntilDate } from '@/lib/domain/billing-period';
import { formatDateOnlyLabel } from '@/lib/domain/date-only';
import { useRenewSubscription } from '@/lib/data/use-subscription-commands';
import type { BillingPeriod, SubscriptionDocument } from '@/lib/local-db/monsterly-db';

type RenewSubscriptionControlProps = {
  subscription: SubscriptionDocument;
};

export function RenewSubscriptionControl({ subscription }: RenewSubscriptionControlProps) {
  const renew = useRenewSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(subscription.billing_period);
  const [customDays, setCustomDays] = useState(subscription.custom_days?.toString() ?? '');

  const customDayCount = billingPeriod === 'custom' ? Number(customDays) : undefined;
  const needsCustomDays = billingPeriod === 'custom' && !isValidCustomDays(customDayCount);
  const newPaidUntilDate =
    !isOpen || needsCustomDays
      ? null
      : nextPaidUntilDate(subscription.paid_until_date, billingPeriod, customDayCount);

  function handleOpen() {
    setBillingPeriod(subscription.billing_period);
    setCustomDays(subscription.custom_days?.toString() ?? '');
    setError(null);
    setIsOpen(true);
  }

  async function handleConfirm() {
    setError(null);
    setIsRenewing(true);

    try {
      await renew({
        billing_period: billingPeriod,
        custom_days: customDayCount,
        subscription_id: subscription.id,
      });
      setIsOpen(false);
    } catch (renewError) {
      console.error('Failed to renew the subscription.', renewError);
      setError('No se pudo renovar. Intenta de nuevo.');
    } finally {
      setIsRenewing(false);
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={handleOpen} size="sm" type="button" variant="default">
        Renovar
      </Button>
    );
  }

  return (
    <div className="grid w-full gap-3 border-t pt-3">
      <Field>
        <FieldLabel htmlFor={`renew-period-${subscription.id}`}>Renovar por</FieldLabel>
        <BillingPeriodSelect
          id={`renew-period-${subscription.id}`}
          onChange={(event) => setBillingPeriod(event.target.value as BillingPeriod)}
          value={billingPeriod}
        />
      </Field>
      {billingPeriod === 'custom' ? (
        <Field>
          <FieldLabel htmlFor={`renew-custom-days-${subscription.id}`}>Días del periodo</FieldLabel>
          <Input
            id={`renew-custom-days-${subscription.id}`}
            inputMode="numeric"
            min={1}
            onChange={(event) => setCustomDays(event.target.value)}
            type="number"
            value={customDays}
          />
        </Field>
      ) : null}
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
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isRenewing || !newPaidUntilDate}
          onClick={handleConfirm}
          size="sm"
          type="button"
        >
          Confirmar
        </Button>
        <Button
          disabled={isRenewing}
          onClick={() => setIsOpen(false)}
          size="sm"
          type="button"
          variant="destructive"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
