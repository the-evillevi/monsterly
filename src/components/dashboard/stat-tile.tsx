import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type StatTone = 'destructive' | 'muted' | 'primary' | 'success' | 'warning';

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
      <Card className="h-full gap-2 border-t-4 transition-shadow hover:shadow-md" data-tone={tone}>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <strong className="text-4xl font-black leading-none tabular-nums tracking-tight text-foreground">
            {value}
          </strong>
        </CardContent>
      </Card>
    </Link>
  );
}
