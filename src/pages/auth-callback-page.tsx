import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { consumeReturnPath } from '@/lib/auth/return-path';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * Lands here after Google redirects back. The singleton client auto-exchanges
 * the `?code=` (detectSessionInUrl) and the provider resolves membership:
 * `member` returns to the stashed route, `denied` falls through the guard's
 * "Sin acceso" screen (session already revoked), and `signedOut` means the
 * exchange failed.
 */
export function AuthCallbackPage() {
  const { status } = useAuth();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'member' && target === null) {
      setTarget(consumeReturnPath());
    }
  }, [status, target]);

  if (target) {
    return <Navigate to={target} replace />;
  }

  if (status === 'denied') {
    // Route through a guarded page so RequireAuth renders "Sin acceso".
    return <Navigate to="/dashboard" replace />;
  }

  if (status === 'signedOut') {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <div className="w-full max-w-sm">
          <Card className="grid gap-4 p-6 text-center sm:p-8">
            <h1 className="text-xl font-black tracking-tight text-foreground">
              No se pudo iniciar sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              El enlace de acceso expiró o es inválido. Vuelve a intentarlo.
            </p>
            <Button asChild className="h-11 w-full">
              <Link to="/login">Volver a iniciar sesión</Link>
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <p className="text-sm text-muted-foreground" role="status">
        Iniciando sesión…
      </p>
    </main>
  );
}
