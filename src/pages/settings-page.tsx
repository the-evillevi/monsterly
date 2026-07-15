import { Card } from '@/components/ui/card';
import { PageFrame } from '@/components/page-frame';

export function SettingsPage() {
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
