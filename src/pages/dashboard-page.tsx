import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageFrame } from '@/components/page-frame';
import { useSubscriberSummaries } from '@/lib/data/use-subscriber-summaries';

export function DashboardPage() {
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
