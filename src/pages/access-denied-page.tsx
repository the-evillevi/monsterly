import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * Shown when an authenticated Google account has no active membership in the
 * configured organization. The provider has already revoked the session; we
 * keep it in state only to show which account was rejected.
 */
export function AccessDeniedPage() {
  const { session } = useAuth();
  const email = session?.user?.email;

  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Card className="grid gap-4 p-6 text-center sm:p-8">
          <h1 className="text-xl font-black tracking-tight text-foreground">Sin acceso</h1>
          <p className="text-sm text-muted-foreground">
            {email ? (
              <>
                La cuenta <span className="font-medium text-foreground">{email}</span> no tiene
                acceso a esta organización.
              </>
            ) : (
              'Tu cuenta no tiene acceso a esta organización.'
            )}{' '}
            Pide al administrador que te dé de alta.
          </p>
          <Button asChild className="h-11 w-full" variant="outline">
            <Link to="/login">Probar con otra cuenta</Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}
