import { type FormEvent, type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { SubscriberDocument } from '@/lib/local-db/monsterly-db';

export type SubscriberFormValues = {
  gender: SubscriberDocument['gender'];
  name: string;
  phone_number?: string;
};

type SubscriberFormProps = {
  defaultValues?: Partial<SubscriberFormValues>;
  footer?: ReactNode;
  onSubmit: (values: SubscriberFormValues) => Promise<void>;
  submitLabel: string;
};

const genderOptions = [
  { label: 'Prefiero no decir', value: 'unspecified' },
  { label: 'Femenino', value: 'female' },
  { label: 'Masculino', value: 'male' },
  { label: 'No binario', value: 'non_binary' },
] as const;

export function SubscriberForm({
  defaultValues,
  footer,
  onSubmit,
  submitLabel,
}: SubscriberFormProps) {
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();

    if (!name) {
      setNameError('El nombre es obligatorio.');
      return;
    }

    setNameError(null);
    setIsSaving(true);

    try {
      await onSubmit({
        gender: formData.get('gender') as SubscriberFormValues['gender'],
        name,
        phone_number: String(formData.get('phone_number') ?? '').trim() || undefined,
      });
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
          {genderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subscriber-phone">Teléfono (opcional)</Label>
        <Input
          autoComplete="tel"
          defaultValue={defaultValues?.phone_number}
          id="subscriber-phone"
          inputMode="tel"
          name="phone_number"
          type="tel"
        />
      </div>
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
