import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { BillingPeriodSelect } from '@/components/subscriptions/billing-period-select';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { addBillingPeriod, isValidCustomDays } from '@/lib/domain/billing-period';
import { todayDateOnly } from '@/lib/domain/date-only';
import { subscriptionKindLabels } from '@/lib/domain/subscription-kind';
import {
  type BillingPeriod,
  billingPeriods,
  type SubscriptionKind,
  subscriptionKinds,
} from '@/lib/local-db/monsterly-db';

const subscriptionFormSchema = z
  .object({
    billing_period: z.enum(billingPeriods),
    custom_days: z.string(),
    kind: z.enum(subscriptionKinds),
    paid_until_date: z.string().min(1, 'Selecciona la fecha de pagado hasta.'),
    start_date: z.string().min(1, 'Selecciona la fecha de inicio.'),
  })
  .superRefine((values, context) => {
    if (values.billing_period === 'custom' && !isValidCustomDays(Number(values.custom_days))) {
      context.addIssue({
        code: 'custom',
        message: 'Ingresa un número de días de al menos 1.',
        path: ['custom_days'],
      });
    }

    if (values.start_date && values.paid_until_date && values.paid_until_date < values.start_date) {
      context.addIssue({
        code: 'custom',
        message: 'La fecha de pagado hasta debe ser igual o posterior al inicio.',
        path: ['paid_until_date'],
      });
    }
  });

type SubscriptionFormSchema = z.infer<typeof subscriptionFormSchema>;

export type SubscriptionFormValues = {
  billing_period: BillingPeriod;
  custom_days?: number;
  kind: SubscriptionKind;
  paid_until_date: string;
  start_date: string;
};

type SubscriptionFormProps = {
  cancelTo: string;
  defaultValues?: Partial<SubscriptionFormValues>;
  footer?: ReactNode;
  onSubmit: (values: SubscriptionFormValues) => Promise<void>;
  submitLabel: string;
};

export function SubscriptionForm({
  cancelTo,
  defaultValues,
  footer,
  onSubmit,
  submitLabel,
}: SubscriptionFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const suggestPaidUntil = !defaultValues?.paid_until_date;
  const form = useForm<SubscriptionFormSchema>({
    defaultValues: buildDefaultValues(defaultValues),
    resolver: zodResolver(subscriptionFormSchema),
  });
  const { errors, isSubmitting } = form.formState;
  const billingPeriod = form.watch('billing_period');
  const customDays = form.watch('custom_days');
  const startDate = form.watch('start_date');

  useEffect(() => {
    if (!suggestPaidUntil || form.formState.dirtyFields.paid_until_date || !startDate) {
      return;
    }

    try {
      const suggested = addBillingPeriod(
        startDate,
        billingPeriod,
        billingPeriod === 'custom' ? Number(customDays) : undefined,
      );
      form.setValue('paid_until_date', suggested);
    } catch {
      // Clear the stale suggestion until the custom days are valid.
      form.setValue('paid_until_date', '');
    }
  }, [billingPeriod, customDays, form, startDate, suggestPaidUntil]);

  async function handleSubmit(values: SubscriptionFormSchema) {
    setSubmitError(null);

    try {
      await onSubmit({
        billing_period: values.billing_period,
        custom_days: values.billing_period === 'custom' ? Number(values.custom_days) : undefined,
        kind: values.kind,
        paid_until_date: values.paid_until_date,
        start_date: values.start_date,
      });
    } catch (error) {
      console.error('Failed to save the subscription.', error);
      setSubmitError('No se pudieron guardar los cambios. Intenta de nuevo.');
    }
  }

  return (
    <form className="w-full max-w-sm" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup>
        <Field data-invalid={errors.kind ? true : undefined}>
          <FieldLabel htmlFor="subscription-kind">Tipo</FieldLabel>
          <Select id="subscription-kind" {...form.register('kind')}>
            {subscriptionKinds.map((kind) => (
              <option key={kind} value={kind}>
                {subscriptionKindLabels[kind]}
              </option>
            ))}
          </Select>
          <FieldError>{errors.kind?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.billing_period ? true : undefined}>
          <FieldLabel htmlFor="subscription-billing-period">Periodo</FieldLabel>
          <BillingPeriodSelect
            id="subscription-billing-period"
            {...form.register('billing_period')}
          />
          <FieldError>{errors.billing_period?.message}</FieldError>
        </Field>
        {billingPeriod === 'custom' ? (
          <Field data-invalid={errors.custom_days ? true : undefined}>
            <FieldLabel htmlFor="subscription-custom-days">Días del periodo</FieldLabel>
            <Input
              aria-invalid={errors.custom_days ? true : undefined}
              id="subscription-custom-days"
              inputMode="numeric"
              min={1}
              type="number"
              {...form.register('custom_days')}
            />
            <FieldError>{errors.custom_days?.message}</FieldError>
          </Field>
        ) : null}
        <Field data-invalid={errors.start_date ? true : undefined}>
          <FieldLabel htmlFor="subscription-start-date">Inicio</FieldLabel>
          <Controller
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <DatePicker
                aria-invalid={errors.start_date ? true : undefined}
                id="subscription-start-date"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <FieldError>{errors.start_date?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.paid_until_date ? true : undefined}>
          <FieldLabel htmlFor="subscription-paid-until-date">Pagado hasta</FieldLabel>
          <Controller
            control={form.control}
            name="paid_until_date"
            render={({ field }) => (
              <DatePicker
                aria-invalid={errors.paid_until_date ? true : undefined}
                id="subscription-paid-until-date"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <FieldError>{errors.paid_until_date?.message}</FieldError>
        </Field>
        <FieldError>{submitError}</FieldError>
        <Field orientation="horizontal">
          <Button asChild variant="outline">
            <Link to={cancelTo}>Cancelar</Link>
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </Field>
        {footer}
      </FieldGroup>
    </form>
  );
}

function buildDefaultValues(
  defaultValues?: Partial<SubscriptionFormValues>,
): SubscriptionFormSchema {
  const startDate = defaultValues?.start_date ?? todayDateOnly();
  const billingPeriod = defaultValues?.billing_period ?? 'monthly';

  return {
    billing_period: billingPeriod,
    custom_days: defaultValues?.custom_days?.toString() ?? '',
    kind: defaultValues?.kind ?? 'gym',
    paid_until_date:
      defaultValues?.paid_until_date ??
      (billingPeriod === 'custom' ? '' : addBillingPeriod(startDate, billingPeriod)),
    start_date: startDate,
  };
}
