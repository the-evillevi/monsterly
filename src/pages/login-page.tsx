import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/use-auth';

type LocationState = { from?: { pathname?: string; search?: string } } | null;

function GoogleIcon() {
  return (
    <svg aria-hidden className="size-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { status, offline, signIn } = useAuth();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Already in — bounce to the app (also covers demo / anon local dev, which
  // should never see a login screen).
  if (status === 'member' || status === 'disabled') {
    return <Navigate to="/dashboard" replace />;
  }

  const state = location.state as LocationState;
  const from = state?.from
    ? `${state.from.pathname ?? '/dashboard'}${state.from.search ?? ''}`
    : '/dashboard';

  async function handleSignIn() {
    setIsRedirecting(true);

    try {
      await signIn(from);
    } catch (error) {
      console.error('Failed to start Google sign-in.', error);
      setIsRedirecting(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Card className="grid gap-6 p-6 sm:p-8">
          <div className="grid gap-2 text-center">
            <span
              aria-hidden
              className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-2xl font-black text-primary-foreground"
            >
              M
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground">MythOS</h1>
            <p className="text-sm text-muted-foreground">
              Inicia sesión para administrar tus miembros y sincronizar tus datos.
            </p>
          </div>

          {offline ? (
            <p
              className="rounded-md border border-input bg-secondary/60 px-3 py-2 text-center text-sm text-muted-foreground"
              role="alert"
            >
              Estás sin conexión. Conéctate a internet para iniciar sesión.
            </p>
          ) : null}

          <Button
            className="h-12 w-full"
            disabled={offline || isRedirecting}
            onClick={() => void handleSignIn()}
            type="button"
            variant="outline"
          >
            <GoogleIcon />
            {isRedirecting ? 'Redirigiendo…' : 'Continuar con Google'}
          </Button>
        </Card>
      </div>
    </main>
  );
}
