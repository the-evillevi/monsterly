import { CheckInRow } from '@/components/check-ins/check-in-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CheckInFeedItem } from '@/lib/data/use-check-ins';

type TodayCheckInListProps = {
  items: CheckInFeedItem[];
};

export function TodayCheckInList({ items }: TodayCheckInListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visitas de hoy</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay visitas registradas hoy. Escanea el código de un miembro para empezar.
          </p>
        ) : (
          <ul className="divide-y" aria-label="Visitas registradas hoy">
            {items.map((item) => (
              <CheckInRow item={item} key={item.id} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
