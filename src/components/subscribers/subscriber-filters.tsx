import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SubscriptionPlan } from '@/lib/domain/subscriber-summaries';

const disciplineOptions: SubscriptionPlan[] = ['Gym', 'CrossFit'];

type SubscriberFiltersProps = {
  disciplines: Set<SubscriptionPlan>;
  onDisciplinesChange: (next: Set<SubscriptionPlan>) => void;
  onQueryChange: (query: string) => void;
  query: string;
};

export function SubscriberFilters({
  disciplines,
  onDisciplinesChange,
  onQueryChange,
  query,
}: SubscriberFiltersProps) {
  function toggleDiscipline(discipline: SubscriptionPlan) {
    const next = new Set(disciplines);

    if (next.has(discipline)) {
      next.delete(discipline);
    } else {
      next.add(discipline);
    }

    onDisciplinesChange(next);
  }

  return (
    <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Buscar por nombre o teléfono"
          className="pl-9"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nombre o teléfono"
          type="search"
          value={query}
        />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Disciplina">
        {disciplineOptions.map((discipline) => {
          const active = disciplines.has(discipline);

          return (
            <Button
              aria-pressed={active}
              key={discipline}
              onClick={() => toggleDiscipline(discipline)}
              size="sm"
              type="button"
              variant={active ? 'default' : 'outline'}
            >
              {discipline}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
