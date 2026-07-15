import type { ReactNode } from 'react';

type PageFrameProps = {
  actions?: ReactNode;
  children: ReactNode;
  subtitle: string;
  title: string;
};

export function PageFrame({ actions, children, subtitle, title }: PageFrameProps) {
  return (
    <section className="grid gap-6" aria-labelledby="page-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1
            id="page-title"
            className="text-2xl font-black tracking-tight text-foreground sm:text-3xl"
          >
            {title}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
