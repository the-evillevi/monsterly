import { Link } from 'react-router-dom';

import { CheckInRow } from '@/components/check-ins/check-in-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CheckInFeedItem } from '@/lib/data/use-check-ins';

type CheckInFeedProps = {
  items: CheckInFeedItem[];
};

export function CheckInFeed({ items }: CheckInFeedProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Actividad reciente</CardTitle>
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          to="/check-in"
        >
          Registrar visita
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay entradas. Las visitas aparecerán aquí en cuanto alguien registre su
            código.
          </p>
        ) : (
          <ul className="divide-y" aria-label="Entradas recientes">
            {items.map((item) => (
              <CheckInRow item={item} key={item.id} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
