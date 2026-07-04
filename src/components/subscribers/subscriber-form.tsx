import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { isValidPhoneNumber } from '@/lib/domain/phone-number';
import { type SubscriberGender, subscriberGenders } from '@/lib/local-db/monsterly-db';

const subscriberFormSchema = z.object({
  gender: z.enum(subscriberGenders),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  phone_number: z.union([
    z.literal(''),
    z.string().refine(isValidPhoneNumber, 'Ingresa un teléfono válido de al menos 10 dígitos.'),
  ]),
});

type SubscriberFormSchema = z.infer<typeof subscriberFormSchema>;

export type SubscriberFormValues = {
  gender: SubscriberGender;
  name: string;
  phone_number?: string;
};

type SubscriberFormProps = {
  defaultValues?: Partial<SubscriberFormValues>;
  footer?: ReactNode;
  onSubmit: (values: SubscriberFormValues) => Promise<void>;
  submitLabel: string;
};

const genderLabels: Record<SubscriberGender, string> = {
  female: 'Femenino',
  male: 'Masculino',
  non_binary: 'No binario',
  unspecified: 'Prefiero no decir',
};

export function SubscriberForm({
  defaultValues,
  footer,
  onSubmit,
  submitLabel,
}: SubscriberFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<SubscriberFormSchema>({
    defaultValues: {
      gender: defaultValues?.gender ?? 'unspecified',
      name: defaultValues?.name ?? '',
      phone_number: defaultValues?.phone_number ?? '',
    },
    resolver: zodResolver(subscriberFormSchema),
  });
  const { errors, isSubmitting } = form.formState;

  async function handleSubmit(values: SubscriberFormSchema) {
    setSubmitError(null);

    try {
      await onSubmit({
        gender: values.gender,
        name: values.name,
        phone_number: values.phone_number || undefined,
      });
    } catch (error) {
      console.error('Failed to save the subscriber.', error);
      setSubmitError('No se pudieron guardar los cambios. Intenta de nuevo.');
    }
  }

  return (
    <form className="w-full max-w-sm" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="subscriber-name">Nombre</FieldLabel>
          <Input
            aria-invalid={errors.name ? true : undefined}
            id="subscriber-name"
            type="text"
            {...form.register('name')}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.gender ? true : undefined}>
          <FieldLabel htmlFor="subscriber-gender">Género</FieldLabel>
          <Select id="subscriber-gender" {...form.register('gender')}>
            {subscriberGenders.map((gender) => (
              <option key={gender} value={gender}>
                {genderLabels[gender]}
              </option>
            ))}
          </Select>
          <FieldError>{errors.gender?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.phone_number ? true : undefined}>
          <FieldLabel htmlFor="subscriber-phone">Teléfono (opcional)</FieldLabel>
          <Input
            aria-invalid={errors.phone_number ? true : undefined}
            autoComplete="tel"
            id="subscriber-phone"
            inputMode="tel"
            type="tel"
            {...form.register('phone_number')}
          />
          <FieldError>{errors.phone_number?.message}</FieldError>
        </Field>
        <FieldError>{submitError}</FieldError>
        <Field orientation="horizontal">
          <Button asChild variant="outline">
            <Link to="/subscribers">Cancelar</Link>
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
