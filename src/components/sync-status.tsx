import { Badge } from '@/components/ui/badge';
import { useSyncStatus } from '@/lib/sync/use-sync-status';
import type { SyncStatusSnapshot } from '@/lib/sync/types';
import { cn } from '@/lib/utils';

type SyncStatusProps = {
  compact?: boolean;
};

export function SyncStatus({ compact = false }: SyncStatusProps) {
  const status = useSyncStatus();

  return (
    <span role="status" aria-live="polite">
      {compact ? renderDot(status) : renderBadge(status)}
    </span>
  );
}

function statusPresentation(status: SyncStatusSnapshot) {
  if (status.phase === 'idle') {
    return { dotClass: 'bg-success', label: 'Synced' };
  }
  if (status.phase === 'offline') {
    return { dotClass: 'bg-muted-foreground', label: 'Offline' };
  }
  if (status.phase === 'error') {
    return { dotClass: 'bg-destructive', label: status.error ?? 'Sync error' };
  }
  if (status.phase === 'local') {
    return { dotClass: 'bg-muted-foreground', label: 'Local only' };
  }
  return { dotClass: 'bg-warning', label: 'Syncing' };
}

function renderDot(status: SyncStatusSnapshot) {
  const { dotClass, label } = statusPresentation(status);
  return (
    <span
      aria-label={label}
      className={cn('mx-auto block size-2.5 rounded-full', dotClass)}
      title={label}
    />
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
