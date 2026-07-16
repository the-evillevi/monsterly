import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscriberDayVisits } from '@/lib/data/use-day-visits';
import { formatDayVisitPrice, getDayVisitOption } from '@/lib/domain/day-visits';
import { formatDateOnlyLabel } from '@/lib/domain/date-only';

export function DayVisitHistorySection({ subscriberId }: { subscriberId: string }) {
  const { isLoading, visits } = useSubscriberDayVisits(subscriberId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visitas de un día</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando visitas...</p> : null}
        {!isLoading && visits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay visitas de un día vinculadas.</p>
        ) : null}
        {visits.length > 0 ? (
          <ul aria-label="Visitas de un día del miembro" className="divide-y">
            {visits.map((visit) => {
              const option = getDayVisitOption(visit.visit_type);

              return (
                <li className="flex items-center justify-between gap-3 py-3" key={visit.id}>
                  <span className="grid gap-0.5">
                    <strong className="text-sm text-foreground">{option.label}</strong>
                    <span className="text-xs text-muted-foreground">
                      {formatDateOnlyLabel(visit.visit_date)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatDayVisitPrice(visit.price)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
