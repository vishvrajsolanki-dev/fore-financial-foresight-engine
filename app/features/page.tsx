import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <header className="mkt-nav">
        <Link href="/" className="fore-brand text-xl">
          FORE
        </Link>
        <Link href="/register" className="btn text-sm py-2">
          Start free
        </Link>
      </header>
      <main id="main" className="px-5 sm:px-10 py-16 max-w-3xl mx-auto">
        <h1 className="display text-4xl">Features</h1>
        <p className="muted mt-3 mb-12">Three faces. One financial context.</p>
        {[
          ["Past", "Archetype radar, burn trend, transactions, merchant detail."],
          ["Decide", "Affordability chat grounded by canIAfford — with an optional context drawer."],
          ["Ahead", "Goal pace calculator and peer benchmarks."],
          ["Insights", "A weekly foresight brief written from your session."],
          ["Reports", "Build filtered previews and export CSV."],
        ].map(([t, b]) => (
          <section key={t} className="mb-10">
            <h2 className="display text-2xl">{t}</h2>
            <p className="muted mt-2">{b}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
