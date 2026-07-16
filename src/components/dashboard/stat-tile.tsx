import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type StatTone = 'destructive' | 'muted' | 'primary' | 'success' | 'warning';

type StatTileBaseProps = {
  detail?: string;
  label: string;
  tone: StatTone;
  value: number | string;
};

export type StatTileProps = StatTileBaseProps &
  ({ onClick: () => void; to?: never } | { onClick?: never; to: string });

export function StatTile({ detail, label, onClick, to, tone, value }: StatTileProps) {
  const content = (
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
        {detail ? <span className="mt-1 block text-xs text-muted-foreground">{detail}</span> : null}
      </CardContent>
    </Card>
  );

  const className =
    'rounded-lg text-left outline-none ring-ring transition-colors focus-visible:ring-2';

  return to ? (
    <Link className={className} to={to}>
      {content}
    </Link>
  ) : (
    <button className={className} onClick={onClick} type="button">
      {content}
    </button>
  );
}
