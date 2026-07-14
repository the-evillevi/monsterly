import { Link } from 'react-router-dom';

import { SubscriberAvatar } from '@/components/subscriber-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { GhostRecord } from '@/lib/domain/ghosts';

type GhostListProps = {
  ghosts: GhostRecord[];
};

function telHref(phoneNumber: string) {
  return `tel:${phoneNumber.replace(/[^+\d]/g, '')}`;
}

function lastSeenLabel(ghost: GhostRecord) {
  if (ghost.lastSeenKind === 'check_in') {
    return `Última visita hace ${ghost.daysMissing} días`;
  }

  return `Sin visitas — ${ghost.daysMissing} días desde su último pago`;
}

export function GhostList({ ghosts }: GhostListProps) {
  if (ghosts.length === 0) {
    return (
      <p className="text-muted-foreground">
        Nadie está desaparecido. Los miembros activos han venido en las últimas dos semanas.
      </p>
    );
  }

  return (
    <ul className="grid max-w-3xl gap-3">
      {ghosts.map((ghost) => (
        <li key={ghost.id}>
          <Card className="p-4">
            <article className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex items-center gap-3">
                <SubscriberAvatar id={ghost.id} name={ghost.name} />
                <div className="grid gap-0.5">
                  <strong className="text-foreground">{ghost.name}</strong>
                  {ghost.phoneNumber ? (
                    <a
                      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                      href={telHref(ghost.phoneNumber)}
                    >
                      {ghost.phoneNumber}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin teléfono</span>
                  )}
                </div>
              </div>
              <div className="grid gap-2 sm:justify-items-end">
                <Badge variant="warning">{ghost.daysMissing} días sin venir</Badge>
                <span className="text-sm text-muted-foreground">{lastSeenLabel(ghost)}</span>
                {ghost.slug ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link aria-label={`Ver ${ghost.name}`} to={`/subscribers/${ghost.slug}/edit`}>
                      Ver perfil
                    </Link>
                  </Button>
                ) : null}
              </div>
            </article>
          </Card>
        </li>
      ))}
    </ul>
  );
}
