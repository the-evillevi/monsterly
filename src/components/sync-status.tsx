import { Badge } from '@/components/ui/badge';
import { useSyncStatus } from '@/lib/sync/use-sync-status';
import type { SyncStatusSnapshot } from '@/lib/sync/types';

export function SyncStatus() {
  const status = useSyncStatus();

  return (
    <span role="status" aria-live="polite">
      {renderBadge(status)}
    </span>
  );
}

function renderBadge(status: SyncStatusSnapshot) {
  if (status.phase === 'idle') {
    return <Badge variant="secondary">Synced</Badge>;
  }

  if (status.phase === 'offline') {
    return <Badge variant="outline">Offline</Badge>;
  }

  if (status.phase === 'error') {
    return (
      <Badge title={status.error ?? 'Sync failed'} variant="destructive">
        Sync error
      </Badge>
    );
  }

  if (status.phase === 'local') {
    return <Badge variant="outline">Local only</Badge>;
  }

  return <Badge variant="outline">Syncing</Badge>;
}
