import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusCards = [
  {
    label: 'Al corriente',
    count: 52,
    tone: 'success',
  },
  {
    label: 'Por vencer',
    count: 18,
    tone: 'warning',
  },
  {
    label: 'Vencidos',
    count: 10,
    tone: 'destructive',
  },
] as const;

function App() {
  return (
    <main className="mx-auto min-h-screen w-[min(100%-2rem,65rem)] py-12 sm:w-[min(100%-3rem,65rem)]">
      <section className="grid max-w-3xl gap-5 py-8" aria-labelledby="page-title">
        <Badge className="w-fit" variant="secondary">
          Offline-first gym subscription control
        </Badge>
        <h1
          id="page-title"
          className="text-5xl font-black leading-none text-foreground sm:text-7xl"
        >
          Monsterly
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          See who is paid up, who is about to expire, and who already needs a payment follow-up.
        </p>
        <Button className="w-fit">View subscribers</Button>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Subscription status summary">
        {statusCards.map((card) => (
          <Card className="border-t-6" data-tone={card.tone} key={card.label}>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <strong className="text-5xl leading-none text-foreground">{card.count}</strong>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

export default App;
