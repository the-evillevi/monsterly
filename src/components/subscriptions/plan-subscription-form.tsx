import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { addBillingPeriod } from '@/lib/domain/billing-period';
import { todayDateOnly } from '@/lib/domain/date-only';
import { planFacilityLabels } from '@/lib/domain/plan-facilities';
import type { PlanDocument } from '@/lib/local-db/monsterly-db';

const planSubscriptionFormSchema = z
  .object({
    paid_until_date: z.string().min(1, 'Selecciona la fecha de pagado hasta.'),
    plan_id: z.string().min(1, 'Selecciona un plan.'),
    start_date: z.string().min(1, 'Selecciona la fecha de inicio.'),
  })
  .superRefine((values, context) => {
    if (values.start_date && values.paid_until_date && values.paid_until_date < values.start_date) {
      context.addIssue({
        code: 'custom',
        message: 'La fecha de pagado hasta debe ser igual o posterior al inicio.',
        path: ['paid_until_date'],
      });
    }
  });

type PlanSubscriptionFormSchema = z.infer<typeof planSubscriptionFormSchema>;

export type PlanSubscriptionFormValues = {
  paid_until_date: string;
  plan_id: string;
  start_date: string;
};

type PlanSubscriptionFormProps = {
  cancelTo: string;
  footer?: ReactNode;
  onSubmit: (values: PlanSubscriptionFormValues) => Promise<void>;
  plans: PlanDocument[];
  submitLabel: string;
};

function describePlanAccess(plan: PlanDocument) {
  const access = plan.facility_access.map((facility) => planFacilityLabels[facility]).join(' + ');
  const limit = plan.weekly_visit_limit ? ` · ${plan.weekly_visit_limit} visitas por semana` : '';

  return `Acceso: ${access}${limit}`;
}

export function PlanSubscriptionForm({
  cancelTo,
  footer,
  onSubmit,
  plans,
  submitLabel,
}: PlanSubscriptionFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<PlanSubscriptionFormSchema>({
    defaultValues: {
      paid_until_date: addBillingPeriod(todayDateOnly(), 'monthly'),
      plan_id: '',
      start_date: todayDateOnly(),
    },
    resolver: zodResolver(planSubscriptionFormSchema),
  });
  const { errors, isSubmitting } = form.formState;
  const startDate = form.watch('start_date');
  const selectedPlan = plans.find((plan) => plan.id === form.watch('plan_id'));

  useEffect(() => {
    if (form.formState.dirtyFields.paid_until_date || !startDate) {
      return;
    }

    // Every catalog plan is a mensualidad: suggest one month from the start.
    form.setValue('paid_until_date', addBillingPeriod(startDate, 'monthly'));
  }, [form, startDate]);

  async function handleSubmit(values: PlanSubscriptionFormSchema) {
    setSubmitError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Failed to save the subscription.', error);
      setSubmitError('No se pudieron guardar los cambios. Intenta de nuevo.');
    }
  }

  return (
    <form className="w-full max-w-sm" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup>
        <Field data-invalid={errors.plan_id ? true : undefined}>
          <FieldLabel htmlFor="subscription-plan">Plan</FieldLabel>
          <Select id="subscription-plan" {...form.register('plan_id')}>
            <option value="">Selecciona un plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — ${plan.price}
              </option>
            ))}
          </Select>
          {selectedPlan ? (
            <p className="text-sm text-muted-foreground">{describePlanAccess(selectedPlan)}</p>
          ) : null}
          <FieldError>{errors.plan_id?.message}</FieldError>
        </Field>
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
          <Button asChild variant="destructive">
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
