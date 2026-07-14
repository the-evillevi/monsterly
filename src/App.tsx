import { Navigate, NavLink, Route, Routes } from 'react-router-dom';

import { AppSidebar } from '@/components/app-sidebar';
import { PageFrame } from '@/components/page-frame';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SubscriberList } from '@/components/subscribers/subscriber-list';
import { UpdatePrompt } from '@/components/update-prompt';
import { CheckInPage } from '@/pages/check-in-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { EditSubscriberPage } from '@/pages/edit-subscriber-page';
import { EditSubscriptionPage } from '@/pages/edit-subscription-page';
import { NewSubscriberPage } from '@/pages/new-subscriber-page';
import { NewSubscriptionPage } from '@/pages/new-subscription-page';
import { SettingsPage } from '@/pages/settings-page';
import { SubscribersPage } from '@/pages/subscribers-page';

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

function App() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          <NavLink className="font-black md:hidden" to="/dashboard">
            Monsterly
          </NavLink>
        </header>
        <main className="w-full max-w-6xl p-4 sm:p-6 lg:p-10">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/check-in" element={<CheckInPage />} />
            <Route path="/subscribers" element={<SubscribersPage />} />
            <Route path="/subscribers/new" element={<NewSubscriberPage />} />
            <Route path="/subscribers/:slug/edit" element={<EditSubscriberPage />} />
            <Route path="/subscribers/:slug/subscriptions/new" element={<NewSubscriptionPage />} />
            <Route
              path="/subscribers/:slug/subscriptions/:subscriptionId/edit"
              element={<EditSubscriptionPage />}
            />
            <Route path="/vencidos" element={<VencidosPage />} />
            <Route path="/por-vencer" element={<PorVencerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <UpdatePrompt />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
