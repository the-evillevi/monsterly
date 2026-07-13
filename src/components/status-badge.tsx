import { Badge } from '@/components/ui/badge';
import type { SubscriberStatus } from '@/lib/domain/subscriber-summaries';
import { cn } from '@/lib/utils';

const statusVariants = {
  'Al corriente': 'success',
  'Por vencer': 'warning',
  Vencido: 'destructive',
  'Sin suscripción': 'outline',
} as const satisfies Record<SubscriberStatus, string>;

type StatusBadgeProps = {
  className?: string;
  status: SubscriberStatus;
};

export function StatusBadge({ className, status }: StatusBadgeProps) {
  return (
    <Badge className={cn('whitespace-nowrap', className)} variant={statusVariants[status]}>
      {status}
    </Badge>
  );
}
