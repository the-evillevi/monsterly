import type { ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Subscribers', path: '/subscribers' },
  { label: 'Vencidos', path: '/vencidos' },
  { label: 'Por vencer', path: '/por-vencer' },
  { label: 'Settings', path: '/settings' },
];

const metrics = [
  { label: 'Al corriente', value: '52', status: 'current' },
  { label: 'Por vencer', value: '18', status: 'warning' },
  { label: 'Vencidos', value: '10', status: 'danger' },
];

const subscribers = [
  {
    name: 'Mariana Soto',
    plan: 'Gym mensual',
    status: 'Al corriente',
    paidUntil: 'Jul 24',
    paidUntilDate: '2026-07-24',
  },
  {
    name: 'Carlos Perez',
    plan: 'CrossFit semanal',
    status: 'Por vencer',
    paidUntil: 'Jul 02',
    paidUntilDate: '2026-07-02',
  },
  {
    name: 'Lucia Ramos',
    plan: 'Gym + CrossFit',
    status: 'Vencido',
    paidUntil: 'Jun 25',
    paidUntilDate: '2026-06-25',
  },
];

function DashboardPage() {
  return (
    <PageFrame title="Dashboard" subtitle="Fast payment status at a glance.">
      <section className="metric-grid" aria-label="Subscription status summary">
        {metrics.map((metric) => (
          <article className="metric-card" data-status={metric.status} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
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
      <dl className="settings-list">
        <div>
          <dt>Warning window</dt>
          <dd>3 days before expiration</dd>
        </div>
        <div>
          <dt>Primary subscription types</dt>
          <dd>Gym and CrossFit</dd>
        </div>
        <div>
          <dt>Data mode</dt>
          <dd>Offline-first</dd>
        </div>
      </dl>
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
    <section className="page-frame" aria-labelledby="page-title">
      <div className="page-heading">
        <p>Monsterly</p>
        <h1 id="page-title">{title}</h1>
        <span>{subtitle}</span>
      </div>
      {children}
    </section>
  );
}

type SubscriberListProps = {
  filterStatus?: string;
};

function SubscriberList({ filterStatus }: SubscriberListProps) {
  const visibleSubscribers = filterStatus
    ? subscribers.filter((subscriber) => subscriber.status === filterStatus)
    : subscribers;

  return (
    <div className="subscriber-list">
      {visibleSubscribers.map((subscriber) => (
        <article className="subscriber-row" key={subscriber.name}>
          <div>
            <strong>{subscriber.name}</strong>
            <span>{subscriber.plan}</span>
          </div>
          <div>
            <span className="status-pill">{subscriber.status}</span>
            <time dateTime={subscriber.paidUntilDate}>Paid until {subscriber.paidUntil}</time>
          </div>
        </article>
      ))}
    </div>
  );
}

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="/dashboard" aria-label="Monsterly dashboard">
          Monsterly
        </a>
        <nav>
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              key={item.path}
              to={item.path}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
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
