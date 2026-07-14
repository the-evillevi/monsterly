import { StatusBadge } from '@/components/status-badge';
import { SubscriberAvatar } from '@/components/subscriber-avatar';
import { formatRelativeTime } from '@/lib/domain/check-ins';
import type { CheckInFeedItem } from '@/lib/data/use-check-ins';

type CheckInRowProps = {
  item: CheckInFeedItem;
};

export function CheckInRow({ item }: CheckInRowProps) {
  const summary = item.subscriber;
  const name = summary?.name ?? 'Miembro archivado';

  return (
    <li className="flex items-center gap-3 py-2">
      <SubscriberAvatar className="size-9" id={item.subscriberId} name={summary?.name ?? '?'} />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-medium text-foreground">{name}</span>
        <time className="text-xs text-muted-foreground" dateTime={item.checkedInAt}>
          {formatRelativeTime(item.checkedInAt)}
        </time>
      </div>
      {summary ? <StatusBadge status={summary.status} /> : null}
    </li>
  );
}
