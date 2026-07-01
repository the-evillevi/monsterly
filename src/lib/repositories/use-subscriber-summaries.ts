import { useContext, useEffect, useState } from 'react';

import { RepositoryContext } from './repository-context';
import { buildSubscriberSummaries, type SubscriberSummary } from './subscriber-summaries';

export function useSubscriberSummaries(filterStatus?: string) {
  const { repositories } = useContext(RepositoryContext);
  const [summaries, setSummaries] = useState<SubscriberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummaries() {
      if (!repositories) {
        return;
      }

      const [subscribers, subscriptions] = await Promise.all([
        repositories.subscribers.list(),
        repositories.subscriptions.list(),
      ]);
      const nextSummaries = buildSubscriberSummaries({
        subscribers,
        subscriptions,
      });

      if (isMounted) {
        setSummaries(
          filterStatus
            ? nextSummaries.filter((summary) => summary.status === filterStatus)
            : nextSummaries,
        );
        setIsLoading(false);
      }
    }

    void loadSummaries();

    return () => {
      isMounted = false;
    };
  }, [filterStatus, repositories]);

  return {
    isLoading,
    summaries,
  };
}
