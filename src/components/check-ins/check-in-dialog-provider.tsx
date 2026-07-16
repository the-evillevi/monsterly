import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import {
  CheckInDialogContext,
  type CheckInDialogContextValue,
} from '@/components/check-ins/check-in-dialog-context';
import {
  CheckInResultCard,
  type CheckInOutcome,
} from '@/components/check-ins/check-in-result-card';
import { StatusBadge } from '@/components/status-badge';
import { SubscriberAvatar } from '@/components/subscriber-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  useFindSubscriberByCheckInCode,
  useGetSubscriberSummary,
  useRecordCheckIn,
} from '@/lib/data/use-check-in-commands';
import { ExpiredSubscriberCheckInError } from '@/lib/data/check-ins.commands';
import { useSubscriberSummaries } from '@/lib/data/use-subscriber-summaries';
import { findSubscriberMatches } from '@/lib/domain/fuzzy-search';

const resultClearMs = 8_000;

export function CheckInDialogProvider({ children }: { children: ReactNode }) {
  const recordCheckIn = useRecordCheckIn();
  const findSubscriberByCheckInCode = useFindSubscriberByCheckInCode();
  const getSubscriberSummary = useGetSubscriberSummary();
  const { subscriptionsBySubscriber, summaries } = useSubscriberSummaries();
  const summariesById = useMemo(
    () => new Map(summaries.map((summary) => [summary.id, summary])),
    [summaries],
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const scheduleClear = useCallback(() => {
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setOutcome(null), resultClearMs);
  }, []);

  const openSearch = useCallback(() => {
    clearTimeout(clearTimer.current);
    setQuery('');
    setOutcome(null);
    setOpen(true);
    focusInput();
  }, [focusInput]);

  const recordSubscriber = useCallback<CheckInDialogContextValue['recordSubscriber']>(
    async (subscriberId) => {
      setOpen(true);
      setQuery('');
      clearTimeout(clearTimer.current);

      if (submittingRef.current) {
        return;
      }

      let subscriber = summariesById.get(subscriberId);

      if (!subscriber) {
        try {
          subscriber = (await getSubscriberSummary(subscriberId)) ?? undefined;
        } catch (error) {
          console.error('Failed to load the subscriber before check-in.', error);
          setOutcome({
            kind: 'error',
            message:
              'No se pudo consultar al miembro. Revisa la conexión local e intenta de nuevo.',
          });
          focusInput();
          return;
        }
      }

      if (!subscriber) {
        setOutcome({
          kind: 'error',
          message: 'El miembro ya no está disponible en la lista activa.',
        });
        focusInput();
        return;
      }

      if (subscriber.status === 'Vencido') {
        setOutcome({
          kind: 'blocked',
          subscriberSnapshot: subscriber,
          subscriberId,
        });
        scheduleClear();
        focusInput();
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);
      setOutcome(null);

      try {
        const { checkIn, duplicate } = await recordCheckIn({ subscriber_id: subscriberId });
        setOutcome({
          checkedInAt: checkIn.checked_in_at,
          duplicate,
          kind: 'recorded',
          subscriberSnapshot: subscriber,
          subscriberId,
        });
        scheduleClear();
      } catch (error) {
        if (error instanceof ExpiredSubscriberCheckInError) {
          setOutcome({
            kind: 'blocked',
            subscriberSnapshot: error.subscriber,
            subscriberId,
          });
          scheduleClear();
          return;
        }

        console.error('Failed to record the check-in.', error);
        setOutcome({
          kind: 'error',
          message: 'Revisa la conexión local e intenta de nuevo. No se registró otra entrada.',
        });
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
        focusInput();
      }
    },
    [focusInput, getSubscriberSummary, recordCheckIn, scheduleClear, summariesById],
  );

  const matches = useMemo(() => findSubscriberMatches(summaries, query), [query, summaries]);
  const resultSubscriber =
    outcome?.kind === 'recorded' || outcome?.kind === 'blocked'
      ? (summariesById.get(outcome.subscriberId) ?? outcome.subscriberSnapshot)
      : undefined;
  const resultSubscriptions = resultSubscriber
    ? (subscriptionsBySubscriber.get(resultSubscriber.id) ?? [])
    : [];

  function handleOpenChange(next: boolean) {
    setOpen(next);

    if (!next) {
      clearTimeout(clearTimer.current);
      setQuery('');
      setOutcome(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    const digits = trimmed.replace(/\D/g, '');
    const exactPin =
      digits.length === 6 ? summaries.find((summary) => summary.checkInCode === digits) : undefined;

    if (!exactPin && digits.length === 6) {
      try {
        const subscriber = await findSubscriberByCheckInCode(digits);
        if (subscriber) {
          await recordSubscriber(subscriber.id);
          return;
        }
      } catch (error) {
        console.error('Failed to find the subscriber by PIN.', error);
        setOutcome({
          kind: 'error',
          message: 'No se pudo consultar el PIN. Revisa la conexión local e intenta de nuevo.',
        });
        focusInput();
        return;
      }
    }

    if (exactPin) {
      void recordSubscriber(exactPin.id);
      return;
    }

    if (trimmed && matches.length === 0) {
      setOutcome({ kind: 'unknown', query: trimmed });
      scheduleClear();
    }
  }

  const contextValue = useMemo<CheckInDialogContextValue>(
    () => ({ openSearch, recordSubscriber }),
    [openSearch, recordSubscriber],
  );

  return (
    <CheckInDialogContext.Provider value={contextValue}>
      {children}
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Registrar entrada</DialogTitle>
            <DialogDescription>
              Busca por nombre, celular o PIN. Un PIN exacto se registra con Enter.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="check-in-search">Miembro</FieldLabel>
                <Input
                  autoComplete="off"
                  className="h-12"
                  id="check-in-search"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setOutcome(null);
                  }}
                  placeholder="Nombre, celular o PIN"
                  ref={inputRef}
                  value={query}
                />
              </Field>
            </FieldGroup>

            {query.trim().length >= 2 ? (
              matches.length > 0 ? (
                <ul aria-label="Resultados de miembros" className="grid gap-2">
                  {matches.map((subscriber) => (
                    <li key={subscriber.id}>
                      <button
                        className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={isSubmitting}
                        onClick={() => void recordSubscriber(subscriber.id)}
                        type="button"
                      >
                        <SubscriberAvatar
                          className="size-10"
                          id={subscriber.id}
                          {...subscriber.nameParts}
                        />
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate font-medium">{subscriber.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {subscriber.phoneNumber ?? 'Sin celular'} · PIN{' '}
                            <span className="tabular-nums">{subscriber.checkInCode ?? '—'}</span>
                          </span>
                        </span>
                        <StatusBadge status={subscriber.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No se encontraron miembros.</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Escribe al menos dos caracteres para buscar.
              </p>
            )}

            {isSubmitting ? (
              <p aria-live="polite" className="text-sm text-muted-foreground">
                Registrando entrada...
              </p>
            ) : null}

            {outcome ? (
              <CheckInResultCard
                outcome={outcome}
                subscriber={resultSubscriber}
                subscriptions={resultSubscriptions}
              />
            ) : null}
          </form>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CheckInDialogContext.Provider>
  );
}
