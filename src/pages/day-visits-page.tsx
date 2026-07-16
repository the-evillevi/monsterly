import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketCheck, Undo2, UserRound, X } from 'lucide-react';

import { PageFrame } from '@/components/page-frame';
import { SubscriberAvatar } from '@/components/subscriber-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useArchiveDayVisit, useRecordDayVisit } from '@/lib/data/use-day-visit-commands';
import { useDayVisits } from '@/lib/data/use-day-visits';
import { useSubscriberSummaries } from '@/lib/data/use-subscriber-summaries';
import { dayVisitOptions, formatDayVisitPrice, getDayVisitOption } from '@/lib/domain/day-visits';
import { formatDateOnlyLabel } from '@/lib/domain/date-only';
import { findSubscriberMatches } from '@/lib/domain/fuzzy-search';
import type { SubscriberSummary } from '@/lib/domain/subscriber-summaries';
import type { DayVisitDocument, DayVisitType } from '@/lib/local-db/monsterly-db';

const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
});

export function DayVisitsPage() {
  const recordDayVisit = useRecordDayVisit();
  const archiveDayVisit = useArchiveDayVisit();
  const { localDayKey, todaySummary, visits } = useDayVisits();
  const { summaries } = useSubscriberSummaries();
  const [query, setQuery] = useState('');
  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberSummary | null>(null);
  const [lastRecordedId, setLastRecordedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const matches = useMemo(() => findSubscriberMatches(summaries, query), [query, summaries]);
  const subscribersById = useMemo(
    () => new Map(summaries.map((subscriber) => [subscriber.id, subscriber])),
    [summaries],
  );
  const groups = useMemo(() => groupVisitsByDate(visits), [visits]);

  async function handleRecord(visitType: DayVisitType) {
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setError(null);
    setIsSaving(true);

    try {
      const visit = await recordDayVisit({
        subscriber_id: selectedSubscriber?.id,
        visit_type: visitType,
      });
      setLastRecordedId(visit.id);
      setSelectedSubscriber(null);
      setQuery('');
    } catch (recordError) {
      console.error('Failed to record a day visit.', recordError);
      setError('No se pudo registrar la visita. Intenta de nuevo.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleUndo() {
    if (!lastRecordedId) {
      return;
    }

    setError(null);

    try {
      await archiveDayVisit(lastRecordedId);
      setLastRecordedId(null);
    } catch (archiveError) {
      console.error('Failed to undo the day visit.', archiveError);
      setError('No se pudo deshacer la visita. Intenta de nuevo.');
    }
  }

  return (
    <PageFrame
      title="Visitas de un día"
      subtitle="Registra pases del día y consulta el ingreso diario."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrar visita</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="day-visit-subscriber">
                  Vincular miembro (opcional)
                </label>
                {selectedSubscriber ? (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <SubscriberAvatar
                      className="size-9"
                      id={selectedSubscriber.id}
                      {...selectedSubscriber.nameParts}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {selectedSubscriber.name}
                    </span>
                    <Button
                      aria-label="Quitar miembro"
                      onClick={() => setSelectedSubscriber(null)}
                      className="size-8"
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <Input
                    autoComplete="off"
                    id="day-visit-subscriber"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nombre, celular o PIN"
                    value={query}
                  />
                )}
                {!selectedSubscriber && query.trim().length >= 2 ? (
                  matches.length > 0 ? (
                    <ul aria-label="Resultados de miembros" className="grid gap-2">
                      {matches.map((subscriber) => (
                        <li key={subscriber.id}>
                          <button
                            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => {
                              setSelectedSubscriber(subscriber);
                              setQuery('');
                            }}
                            type="button"
                          >
                            <SubscriberAvatar
                              className="size-9"
                              id={subscriber.id}
                              {...subscriber.nameParts}
                            />
                            <span className="grid min-w-0 flex-1">
                              <span className="truncate text-sm font-medium">
                                {subscriber.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {subscriber.phoneNumber ?? 'Sin celular'} · PIN{' '}
                                {subscriber.checkInCode ?? '—'}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No se encontraron miembros.</p>
                  )
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {dayVisitOptions.map((option) => (
                  <Button
                    aria-label={`${option.label} ${formatDayVisitPrice(option.price)}`}
                    className="h-auto min-h-24 flex-col gap-1 text-base"
                    disabled={isSaving}
                    key={option.type}
                    onClick={() => void handleRecord(option.type)}
                    type="button"
                    variant="outline"
                  >
                    <TicketCheck aria-hidden className="size-6" />
                    <span>{option.label}</span>
                    <strong>{formatDayVisitPrice(option.price)}</strong>
                  </Button>
                ))}
              </div>

              {isSaving ? (
                <p aria-live="polite" className="text-sm text-muted-foreground">
                  Registrando visita...
                </p>
              ) : null}
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              {lastRecordedId ? (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/40 bg-success/10 p-3"
                  role="status"
                >
                  <span className="text-sm font-medium">Visita registrada.</span>
                  <Button onClick={() => void handleUndo()} size="sm" type="button" variant="ghost">
                    <Undo2 aria-hidden />
                    Deshacer
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay visitas de un día registradas.
                </p>
              ) : (
                <div className="grid gap-6">
                  {groups.map(([visitDate, groupedVisits]) => (
                    <section className="grid gap-2" key={visitDate}>
                      <h3 className="text-sm font-semibold">
                        {visitDate === localDayKey ? 'Hoy' : formatDateOnlyLabel(visitDate)}
                      </h3>
                      <ul
                        className="divide-y rounded-lg border"
                        aria-label={`Visitas ${visitDate}`}
                      >
                        {groupedVisits.map((visit) => (
                          <DayVisitRow
                            key={visit.id}
                            onArchive={async () => {
                              await archiveDayVisit(visit.id);
                              if (lastRecordedId === visit.id) {
                                setLastRecordedId(null);
                              }
                            }}
                            subscriber={
                              visit.subscriber_id
                                ? subscribersById.get(visit.subscriber_id)
                                : undefined
                            }
                            visit={visit}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1">
            <strong className="text-4xl font-black tabular-nums">
              {formatDayVisitPrice(todaySummary.total)}
            </strong>
            <span className="text-sm text-muted-foreground">
              de {todaySummary.count} {todaySummary.count === 1 ? 'visita' : 'visitas'}
            </span>
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}

function DayVisitRow({
  onArchive,
  subscriber,
  visit,
}: {
  onArchive: () => Promise<void>;
  subscriber?: SubscriberSummary;
  visit: DayVisitDocument;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const option = getDayVisitOption(visit.visit_type);

  async function handleArchive() {
    setError(null);
    setIsArchiving(true);

    try {
      await onArchive();
    } catch (archiveError) {
      console.error('Failed to archive the day visit.', archiveError);
      setError('No se pudo anular.');
      setIsArchiving(false);
    }
  }

  return (
    <li className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary"
        >
          {visit.subscriber_id ? (
            <UserRound className="size-4" />
          ) : (
            <TicketCheck className="size-4" />
          )}
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="font-medium">
            {option.label} · {formatDayVisitPrice(visit.price)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {timeFormatter.format(new Date(visit.created_at))}
            {subscriber ? (
              <>
                {' · '}
                <Link
                  className="underline-offset-4 hover:underline"
                  to={`/subscribers/${subscriber.slug ?? subscriber.id}/edit`}
                >
                  {subscriber.name}
                </Link>
              </>
            ) : visit.subscriber_id ? (
              ' · Miembro no disponible'
            ) : (
              ' · Sin miembro vinculado'
            )}
          </span>
        </span>
      </div>
      {isConfirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">¿Anular?</span>
          <Button
            disabled={isArchiving}
            onClick={() => void handleArchive()}
            size="sm"
            type="button"
            variant="destructive"
          >
            Confirmar
          </Button>
          <Button
            disabled={isArchiving}
            onClick={() => setIsConfirming(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button onClick={() => setIsConfirming(true)} size="sm" type="button" variant="ghost">
          Anular
        </Button>
      )}
      {error ? (
        <p className="text-xs text-destructive sm:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function groupVisitsByDate(visits: DayVisitDocument[]) {
  const groups = new Map<string, DayVisitDocument[]>();

  for (const visit of visits) {
    const group = groups.get(visit.visit_date);
    if (group) {
      group.push(visit);
    } else {
      groups.set(visit.visit_date, [visit]);
    }
  }

  return [...groups.entries()];
}
