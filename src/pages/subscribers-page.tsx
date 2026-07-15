import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { PageFrame } from '@/components/page-frame';
import { GhostList } from '@/components/subscribers/ghost-list';
import { SubscriberFilters } from '@/components/subscribers/subscriber-filters';
import { SubscriberList } from '@/components/subscribers/subscriber-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGhosts } from '@/lib/data/use-ghosts';
import { useSubscriberSummaries } from '@/lib/data/use-subscriber-summaries';
import { subscriberMatchesQuery } from '@/lib/domain/fuzzy-search';
import type { SubscriberSummary, SubscriptionPlan } from '@/lib/domain/subscriber-summaries';
import { cn } from '@/lib/utils';

const TABS = [
  { dot: null, label: 'Todos', status: null, value: 'todos' },
  { dot: 'bg-success', label: 'Al corriente', status: 'Al corriente', value: 'al-corriente' },
  { dot: 'bg-warning', label: 'Por vencer', status: 'Por vencer', value: 'por-vencer' },
  { dot: 'bg-destructive', label: 'Vencidos', status: 'Vencido', value: 'vencidos' },
  { dot: 'bg-muted-foreground', label: 'Fantasmas', status: 'ghost', value: 'fantasmas' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

function isTabValue(value: string | null): value is TabValue {
  return TABS.some((tab) => tab.value === value);
}

function matchesDiscipline(summary: SubscriberSummary, disciplines: Set<SubscriptionPlan>) {
  return disciplines.size === 0 || summary.plans.some((plan) => disciplines.has(plan));
}

export function SubscribersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: TabValue = isTabValue(rawTab) ? rawTab : 'todos';

  const [query, setQuery] = useState('');
  const [disciplines, setDisciplines] = useState<Set<SubscriptionPlan>>(new Set());

  const { isLoading, subscriptionsBySubscriber, summaries } = useSubscriberSummaries();
  const { ghosts } = useGhosts();

  const filteredSummaries = useMemo(
    () =>
      summaries.filter(
        (summary) =>
          subscriberMatchesQuery(summary, query) && matchesDiscipline(summary, disciplines),
      ),
    [summaries, query, disciplines],
  );

  const filteredIds = useMemo(
    () => new Set(filteredSummaries.map((summary) => summary.id)),
    [filteredSummaries],
  );
  const filteredGhosts = useMemo(
    () => ghosts.filter((ghost) => filteredIds.has(ghost.id)),
    [ghosts, filteredIds],
  );

  const counts = useMemo<Record<TabValue, number>>(
    () => ({
      todos: filteredSummaries.length,
      'al-corriente': filteredSummaries.filter((summary) => summary.status === 'Al corriente')
        .length,
      'por-vencer': filteredSummaries.filter((summary) => summary.status === 'Por vencer').length,
      vencidos: filteredSummaries.filter((summary) => summary.status === 'Vencido').length,
      fantasmas: filteredGhosts.length,
    }),
    [filteredSummaries, filteredGhosts],
  );

  const tabConfig = TABS.find((tab) => tab.value === activeTab) ?? TABS[0];
  const visibleSummaries = useMemo(() => {
    if (tabConfig.status === null || tabConfig.status === 'ghost') {
      return filteredSummaries;
    }

    const matching = filteredSummaries.filter((summary) => summary.status === tabConfig.status);

    if (tabConfig.value === 'por-vencer' || tabConfig.value === 'vencidos') {
      // Nearest / most overdue first.
      return [...matching].sort((left, right) =>
        (left.paidUntilDate ?? '').localeCompare(right.paidUntilDate ?? ''),
      );
    }

    return matching;
  }, [filteredSummaries, tabConfig]);

  function selectTab(value: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);

        if (value === 'todos') {
          next.delete('tab');
        } else {
          next.set('tab', value);
        }

        return next;
      },
      { replace: true },
    );
  }

  return (
    <PageFrame
      title="Suscriptores"
      subtitle="Controla el estatus de pago de tus miembros."
      actions={
        <Button asChild>
          <Link to="/subscribers/new">Agregar suscriptor</Link>
        </Button>
      }
    >
      <SubscriberFilters
        disciplines={disciplines}
        onDisciplinesChange={setDisciplines}
        onQueryChange={setQuery}
        query={query}
      />

      <Tabs onValueChange={selectTab} value={activeTab}>
        <TabsList className="overflow-x-auto" variant="line">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.dot ? <span aria-hidden className={cn('size-2 rounded-full', tab.dot)} /> : null}
              {tab.label}
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {counts[tab.value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando suscriptores...</p>
      ) : activeTab === 'fantasmas' ? (
        <GhostList ghosts={filteredGhosts} />
      ) : (
        <SubscriberList
          subscriptionsBySubscriber={subscriptionsBySubscriber}
          summaries={visibleSummaries}
        />
      )}
    </PageFrame>
  );
}
