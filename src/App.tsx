import type { ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscriberSummaries } from '@/lib/data/use-subscriber-summaries';
import type { SubscriptionStatus } from '@/lib/domain/subscriber-summaries';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Subscribers', path: '/subscribers' },
  { label: 'Vencidos', path: '/vencidos' },
  { label: 'Por vencer', path: '/por-vencer' },
  { label: 'Settings', path: '/settings' },
];

function DashboardPage() {
  const { summaries } = useSubscriberSummaries();
  const metrics = [
    {
      label: 'Al corriente',
      tone: 'success',
      value: summaries.filter((summary) => summary.status === 'Al corriente').length.toString(),
    },
    {
      label: 'Por vencer',
      tone: 'warning',
      value: summaries.filter((summary) => summary.status === 'Por vencer').length.toString(),
    },
    {
      label: 'Vencidos',
      tone: 'destructive',
      value: summaries.filter((summary) => summary.status === 'Vencido').length.toString(),
    },
  ] as const;

  return (
    <PageFrame title="Dashboard" subtitle="Fast payment status at a glance.">
      <section className="grid gap-4 md:grid-cols-3" aria-label="Subscription status summary">
        {metrics.map((metric) => (
          <Card className="border-t-6" data-tone={metric.tone} key={metric.label}>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <strong className="text-5xl leading-none text-foreground">{metric.value}</strong>
            </CardContent>
          </Card>
        ))}
      </section>
    </PageFrame>
  );
}

function SubscribersPage() {
  return (
    <PageFrame title="Subscribers" subtitle="Manage active gym and CrossFit members.">
      <SubscriberList />
    </PageFrame>
  );
}

function VencidosPage() {
  return (
    <PageFrame title="Vencidos" subtitle="Members who already need payment follow-up.">
      <SubscriberList filterStatus="Vencido" />
    </PageFrame>
  );
}

function PorVencerPage() {
  return (
    <PageFrame title="Por vencer" subtitle="Subscriptions expiring inside the warning window.">
      <SubscriberList filterStatus="Por vencer" />
    </PageFrame>
  );
}

function SettingsPage() {
  return (
    <PageFrame title="Settings" subtitle="Configure the defaults Monsterly will use.">
      <div className="grid max-w-3xl gap-3">
        {[
          ['Warning window', '3 days before expiration'],
          ['Primary subscription types', 'Gym and CrossFit'],
          ['Data mode', 'Offline-first'],
        ].map(([term, description]) => (
          <Card className="p-4" key={term}>
            <dl className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <dt className="font-bold text-foreground">{term}</dt>
              <dd className="text-muted-foreground">{description}</dd>
            </dl>
          </Card>
        ))}
      </div>
    </PageFrame>
  );
}

type PageFrameProps = {
  children: ReactNode;
  subtitle: string;
  title: string;
};

function PageFrame({ children, subtitle, title }: PageFrameProps) {
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

type SubscriberListProps = {
  filterStatus?: SubscriptionStatus;
};

function SubscriberList({ filterStatus }: SubscriberListProps) {
  const { isLoading, summaries } = useSubscriberSummaries(filterStatus);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading subscribers...</p>;
  }

  return (
    <div className="grid max-w-3xl gap-3">
      {summaries.map((subscriber) => (
        <Card className="p-4" key={subscriber.id}>
          <article className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="grid gap-1">
              <strong className="text-foreground">{subscriber.name}</strong>
              <span className="text-muted-foreground">{subscriber.plan}</span>
            </div>
            <div className="grid gap-2 sm:justify-items-end">
              <Badge variant="outline">{subscriber.status}</Badge>
              <time className="text-sm text-muted-foreground" dateTime={subscriber.paidUntilDate}>
                Paid until {subscriber.paidUntilLabel}
              </time>
            </div>
          </article>
        </Card>
      ))}
    </div>
  );
}

function App() {
  return (
    <div className="grid min-h-screen md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="border-b bg-card p-4 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0 md:p-5">
        <div className="grid gap-4 md:gap-8">
          <NavLink
            className="text-xl font-black text-foreground"
            to="/dashboard"
            aria-label="Monsterly dashboard"
          >
            Monsterly
          </NavLink>
          <nav className="flex gap-2 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  [
                    'min-h-11 shrink-0 rounded-md px-3 py-2 font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                    isActive ? 'bg-secondary text-foreground' : null,
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
                key={item.path}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <main className="w-full max-w-6xl p-4 sm:p-6 lg:p-10">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subscribers" element={<SubscribersPage />} />
          <Route path="/vencidos" element={<VencidosPage />} />
          <Route path="/por-vencer" element={<PorVencerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
