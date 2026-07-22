import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageFrame } from '@/components/page-frame';
import { clearMembershipCache } from '@/lib/auth/membership';
import { useAuth } from '@/lib/auth/use-auth';
import { isAuthRequired } from '@/lib/supabase';

export function SettingsPage() {
  const auth = useAuth();
  const showAccount = isAuthRequired() && Boolean(auth.session);
  const email = auth.session?.user?.email;

  async function handleSignOut() {
    // Sign out only clears the session and membership cache. It deliberately
    // does NOT wipe the local RxDB: this is a single-org device, so a wipe would
    // force a full re-pull of ~97 subscribers and could destroy writes not yet
    // pushed. (Shared-device isolation is revisited with EVL-147.)
    clearMembershipCache();
    await auth.signOut();
  }

  return (
    <PageFrame title="Settings" subtitle="Configure the defaults MythOS will use.">
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

        {showAccount ? (
          <Card className="grid gap-3 p-4">
            <div className="grid gap-1">
              <span className="font-bold text-foreground">Cuenta</span>
              {email ? <span className="text-sm text-muted-foreground">{email}</span> : null}
            </div>
            <Button
              className="w-full sm:w-auto sm:justify-self-start"
              onClick={() => void handleSignOut()}
              type="button"
              variant="outline"
            >
              Cerrar sesión
            </Button>
          </Card>
        ) : null}
      </div>
    </PageFrame>
  );
}
