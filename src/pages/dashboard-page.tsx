import { Link } from 'react-router-dom';

import { CheckInFeed } from '@/components/dashboard/check-in-feed';
import { StatTile, type StatTone } from '@/components/dashboard/stat-tile';
import { PageFrame } from '@/components/page-frame';
import { Button } from '@/components/ui/button';
import { useCheckIns } from '@/lib/data/use-check-ins';
import { useGhosts } from '@/lib/data/use-ghosts';
import { useSubscriberSummaries } from '@/lib/data/use-subscriber-summaries';

const FEED_LIMIT = 10;

export function DashboardPage() {
  const { summaries } = useSubscriberSummaries();
  const { ghosts } = useGhosts();
  const { items, uniqueTodayCount } = useCheckIns();

  const countByStatus = (status: string) =>
    summaries.filter((summary) => summary.status === status).length;

  const tiles: { label: string; to: string; tone: StatTone; value: number }[] = [
    {
      label: 'Al corriente',
      to: '/subscribers?tab=al-corriente',
      tone: 'success',
      value: countByStatus('Al corriente'),
    },
    {
      label: 'Por vencer',
      to: '/subscribers?tab=por-vencer',
      tone: 'warning',
      value: countByStatus('Por vencer'),
    },
    {
      label: 'Vencidos',
      to: '/subscribers?tab=vencidos',
      tone: 'destructive',
      value: countByStatus('Vencido'),
    },
    { label: 'Visitas hoy', to: '/check-in', tone: 'primary', value: uniqueTodayCount },
    {
      label: 'Fantasmas',
      to: '/subscribers?tab=fantasmas',
      tone: 'muted',
      value: ghosts.length,
    },
  ];

  return (
    <PageFrame title="Dashboard" subtitle="El pulso operativo de tu gimnasio de un vistazo.">
      <div>
        <Button asChild>
          <Link to="/check-in">Registrar visita</Link>
        </Button>
      </div>

      <section
        aria-label="Resumen del gimnasio"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {tiles.map((tile) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            to={tile.to}
            tone={tile.tone}
            value={tile.value}
          />
        ))}
      </section>

      <CheckInFeed items={items.slice(0, FEED_LIMIT)} />
    </PageFrame>
  );
}
