import { type FormEvent, type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { isValidPhoneNumber } from '@/lib/domain/phone-number';
import { type SubscriberGender, subscriberGenders } from '@/lib/local-db/monsterly-db';

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

function toGender(value: FormDataEntryValue | null): SubscriberGender {
  return subscriberGenders.find((gender) => gender === value) ?? 'unspecified';
}

export function SubscriberForm({
  defaultValues,
  footer,
  onSubmit,
  submitLabel,
}: SubscriberFormProps) {
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const phoneNumber = String(formData.get('phone_number') ?? '').trim();

    if (!name) {
      setNameError('El nombre es obligatorio.');
      return;
    }

    setNameError(null);

    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      setPhoneError('Ingresa un teléfono válido de al menos 10 dígitos.');
      return;
    }

    setPhoneError(null);
    setSubmitError(null);
    setIsSaving(true);

    try {
      await onSubmit({
        gender: toGender(formData.get('gender')),
        name,
        phone_number: phoneNumber || undefined,
      });
    } catch (error) {
      console.error('Failed to save the subscriber.', error);
      setSubmitError('No se pudieron guardar los cambios. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid max-w-md gap-5" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="subscriber-name">Nombre</Label>
        <Input
          aria-describedby={nameError ? 'subscriber-name-error' : undefined}
          aria-invalid={nameError ? true : undefined}
          defaultValue={defaultValues?.name}
          id="subscriber-name"
          name="name"
        />
        {nameError ? (
          <p className="text-sm text-destructive" id="subscriber-name-error">
            {nameError}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subscriber-gender">Género</Label>
        <Select
          defaultValue={defaultValues?.gender ?? 'unspecified'}
          id="subscriber-gender"
          name="gender"
        >
          {subscriberGenders.map((gender) => (
            <option key={gender} value={gender}>
              {genderLabels[gender]}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subscriber-phone">Teléfono (opcional)</Label>
        <Input
          aria-describedby={phoneError ? 'subscriber-phone-error' : undefined}
          aria-invalid={phoneError ? true : undefined}
          autoComplete="tel"
          defaultValue={defaultValues?.phone_number}
          id="subscriber-phone"
          inputMode="tel"
          name="phone_number"
          type="tel"
        />
        {phoneError ? (
          <p className="text-sm text-destructive" id="subscriber-phone-error">
            {phoneError}
          </p>
        ) : null}
      </div>
      {submitError ? (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={isSaving} type="submit">
          {submitLabel}
        </Button>
        <Button asChild variant="outline">
          <Link to="/subscribers">Cancelar</Link>
        </Button>
      </div>
      {footer}
    </form>
  );
}
