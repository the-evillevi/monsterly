import { useCheckInDialog } from '@/components/check-ins/check-in-dialog-context';
import { CheckInRow } from '@/components/check-ins/check-in-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CheckInFeedItem } from '@/lib/data/use-check-ins';

type CheckInFeedProps = {
  items: CheckInFeedItem[];
};

export function CheckInFeed({ items }: CheckInFeedProps) {
  const { openSearch } = useCheckInDialog();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Actividad reciente</CardTitle>
        <button
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={openSearch}
          type="button"
        >
          Registrar visita
        </button>
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
