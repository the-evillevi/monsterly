import { Badge } from '@/components/ui/badge';
import { useSyncStatus } from '@/lib/sync/use-sync-status';

export function SyncStatus() {
  const status = useSyncStatus();

  if (status.phase === 'idle') {
    return <Badge variant="secondary">Synced</Badge>;
  }

  if (status.phase === 'offline') {
    return <Badge variant="outline">Offline</Badge>;
  }

  if (status.phase === 'error') {
    return <Badge variant="destructive">Sync error</Badge>;
  }

  return <Badge variant="outline">Syncing</Badge>;
}
