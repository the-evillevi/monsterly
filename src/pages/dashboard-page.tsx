import { CheckInFeed } from '@/components/dashboard/check-in-feed';
import { Link } from 'react-router-dom';
import { useCheckInDialog } from '@/components/check-ins/check-in-dialog-context';
import { StatTile, type StatTileProps } from '@/components/dashboard/stat-tile';
import { PageFrame } from '@/components/page-frame';
import { Button } from '@/components/ui/button';
import { useCheckIns } from '@/lib/data/use-check-ins';
import { useGhosts } from '@/lib/data/use-ghosts';
import { useDayVisits } from '@/lib/data/use-day-visits';
import { useSubscriberSummaries } from '@/lib/data/use-subscriber-summaries';
import { formatDayVisitPrice } from '@/lib/domain/day-visits';

const FEED_LIMIT = 10;

export function DashboardPage() {
  const { openSearch } = useCheckInDialog();
  const { summaries } = useSubscriberSummaries();
  const { ghosts } = useGhosts();
  const { items, uniqueTodayCount } = useCheckIns();
  const { todaySummary } = useDayVisits();

  const countByStatus = (status: string) =>
    summaries.filter((summary) => summary.status === status).length;

  const tiles: StatTileProps[] = [
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
    { label: 'Entradas hoy', onClick: openSearch, tone: 'primary', value: uniqueTodayCount },
    {
      detail: `de ${todaySummary.count} ${todaySummary.count === 1 ? 'visita' : 'visitas'}`,
      label: 'Visitas del día',
      to: '/day-visits',
      tone: 'primary',
      value: formatDayVisitPrice(todaySummary.total),
    },
    {
      label: 'Fantasmas',
      to: '/subscribers?tab=fantasmas',
      tone: 'muted',
      value: ghosts.length,
    },
  ];

  return (
    <PageFrame
      title="Dashboard"
      subtitle="El pulso operativo de tu gimnasio de un vistazo."
      actions={
        <Button asChild>
          <Link to="/day-visits">Registrar visita</Link>
        </Button>
      }
    >
      <section
        aria-label="Resumen del gimnasio"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </section>

      <CheckInFeed items={items.slice(0, FEED_LIMIT)} />
    </PageFrame>
  );
}
