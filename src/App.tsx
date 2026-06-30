const statusCards = [
  {
    label: 'Al corriente',
    count: 52,
    tone: 'current',
  },
  {
    label: 'Por vencer',
    count: 18,
    tone: 'warning',
  },
  {
    label: 'Vencidos',
    count: 10,
    tone: 'danger',
  },
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Offline-first gym subscription control</p>
        <h1 id="page-title">Monsterly</h1>
        <p className="hero-copy">
          See who is paid up, who is about to expire, and who already needs a
          payment follow-up.
        </p>
      </section>

      <section className="status-grid" aria-label="Subscription status summary">
        {statusCards.map((card) => (
          <article className="status-card" data-tone={card.tone} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.count}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
