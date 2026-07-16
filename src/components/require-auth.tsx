import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/lib/auth/use-auth';
import { AccessDeniedPage } from '@/pages/access-denied-page';

/**
 * Gate for the app shell. `disabled` (demo / anon local dev) and `member` render
 * the app; `loading` shows a minimal splash (never seen in local dev, where
 * `disabled` resolves synchronously); `signedOut` redirects to /login, keeping
 * the intended location so the callback can return to it; `denied` shows the
 * "Sin acceso" screen.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'disabled' || status === 'member') {
    return <>{children}</>;
  }

  if (status === 'denied') {
    return <AccessDeniedPage />;
  }

  if (status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <p className="text-sm text-muted-foreground" role="status">
        Cargando…
      </p>
    </main>
  );
}
