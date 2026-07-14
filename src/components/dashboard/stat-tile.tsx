import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatTone = 'destructive' | 'muted' | 'primary' | 'success' | 'warning';

const toneBorder: Record<StatTone, string> = {
  destructive: 'border-t-destructive',
  muted: 'border-t-muted-foreground',
  primary: 'border-t-primary',
  success: 'border-t-success',
  warning: 'border-t-warning',
};

type StatTileProps = {
  label: string;
  to: string;
  tone: StatTone;
  value: number;
};

export function StatTile({ label, to, tone, value }: StatTileProps) {
  return (
    <Link
      className="rounded-lg outline-none ring-ring transition-colors focus-visible:ring-2"
      to={to}
    >
      <Card className={cn('h-full border-t-6 transition-shadow hover:shadow-md', toneBorder[tone])}>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <strong className="text-4xl leading-none text-foreground">{value}</strong>
        </CardContent>
      </Card>
    </Link>
  );
}
