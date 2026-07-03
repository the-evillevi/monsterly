import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

type PageFrameProps = {
  children: ReactNode;
  subtitle: string;
  title: string;
};

export function PageFrame({ children, subtitle, title }: PageFrameProps) {
  return (
    <section className="grid gap-7" aria-labelledby="page-title">
      <div className="grid max-w-3xl gap-3">
        <Badge className="w-fit" variant="secondary">
          Monsterly
        </Badge>
        <h1
          id="page-title"
          className="text-4xl font-black leading-none text-foreground sm:text-6xl"
        >
          {title}
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
