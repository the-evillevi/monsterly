import { useEffect, useRef, useState } from 'react';

import {
  CheckInResultCard,
  type CheckInOutcome,
} from '@/components/check-ins/check-in-result-card';
import { TodayCheckInList } from '@/components/check-ins/today-check-in-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCheckIns } from '@/lib/data/use-check-ins';
import {
  useFindSubscriberByCheckInCode,
  useGetSubscriberSummary,
  useRecordCheckIn,
} from '@/lib/data/use-check-in-commands';

// A recognized member card lingers this long so the next scan starts clean.
const resultClearMs = 8_000;

export function CheckInTerminal() {
  const findByCode = useFindSubscriberByCheckInCode();
  const getSummary = useGetSubscriberSummary();
  const recordCheckIn = useRecordCheckIn();
  const { todayItems } = useCheckIns();

  const [code, setCode] = useState('');
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  function scheduleClear() {
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setOutcome(null), resultClearMs);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();

    if (!trimmed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const subscriber = await findByCode(trimmed);

      if (!subscriber) {
        setOutcome({ code: trimmed, kind: 'unknown' });
        return;
      }

      const [{ checkIn, duplicate }, summary] = await Promise.all([
        recordCheckIn({ subscriber_id: subscriber.id }),
        getSummary(subscriber.id),
      ]);

      setOutcome({
        checkedInAt: checkIn.checked_in_at,
        duplicate,
        kind: 'recorded',
        subscriber,
        summary: summary ?? undefined,
      });
    } catch (error) {
      console.error('Failed to record the check-in.', error);
      setOutcome({ code: trimmed, kind: 'unknown' });
    } finally {
      setCode('');
      setIsSubmitting(false);
      scheduleClear();
      inputRef.current?.focus();
    }
  }

  return (
    <div className="grid gap-6">
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <Label htmlFor="check-in-code">Código de acceso</Label>
        <div className="flex gap-2">
          <Input
            aria-label="Código de acceso"
            autoComplete="off"
            autoFocus
            className="h-12 text-lg tabular-nums tracking-[0.2em]"
            id="check-in-code"
            inputMode="numeric"
            onChange={(event) => setCode(event.target.value)}
            placeholder="Escanea o escribe el código"
            ref={inputRef}
            value={code}
          />
          <Button className="h-12 px-6" disabled={isSubmitting || !code.trim()} type="submit">
            Registrar
          </Button>
        </div>
      </form>

      {outcome ? <CheckInResultCard outcome={outcome} /> : null}

      <TodayCheckInList items={todayItems} />
    </div>
  );
}
