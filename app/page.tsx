import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      <header className="mkt-nav">
        <Link href="/" className="fore-brand text-xl">
          F<span style={{ color: "var(--accent)" }}>O</span>RE
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold muted">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost btn text-sm py-2">
            Sign in
          </Link>
          <Link href="/register" className="btn text-sm py-2">
            Start free
          </Link>
        </div>
      </header>

      <section className="mkt-hero">
        <div className="mkt-hero-copy rise-in">
          <p className="fore-brand text-4xl sm:text-5xl">
            F<span style={{ color: "var(--accent)" }}>O</span>RE
          </p>
          <h1 className="display text-4xl sm:text-5xl" style={{ maxWidth: "18ch" }}>
            See your financial future clearly
          </h1>
          <p className="muted text-base sm:text-lg" style={{ maxWidth: "36ch" }}>
            Foresight for everyday money decisions — grounded in your real transactions.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/register" className="btn">
              Start free
            </Link>
            <a href="#faces" className="btn-ghost btn">
              See how it works
            </a>
          </div>
        </div>
        <div className="mkt-hero-visual" aria-hidden />
      </section>

      <section id="faces" className="px-5 sm:px-10 py-20 max-w-4xl mx-auto">
        <h2 className="display text-3xl mb-10">Past. Decide. Ahead.</h2>
        <div className="grid gap-10">
          {[
            {
              title: "Past",
              body: "Your spending archetype, burn rate, and balance story — assigned from patterns, never picked from a menu.",
            },
            {
              title: "Decide",
              body: "Ask if you can afford something. Answers come from a real affordability tool, not a guessed number.",
            },
            {
              title: "Ahead",
              body: "Set a goal, see your pace, and compare quietly with peer benchmarks.",
            },
          ].map((s) => (
            <div key={s.title}>
              <h3 className="display text-2xl">{s.title}</h3>
              <p className="muted mt-2 max-w-xl">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 sm:px-10 py-16 border-t" style={{ borderColor: "var(--border)" }}>
        <blockquote className="max-w-2xl mx-auto text-center">
          <p className="display text-2xl">“Finally, a money tool that answers the question I actually ask.”</p>
          <footer className="muted mt-4 text-sm">Early FORE user</footer>
        </blockquote>
      </section>

      <section className="px-5 sm:px-10 py-16 text-center">
        <h2 className="display text-3xl">Simple pricing</h2>
        <p className="muted mt-2 mb-6">Start free. Upgrade when you need reports and extras.</p>
        <Link href="/pricing" className="btn">
          View pricing
        </Link>
      </section>

      <footer
        className="px-5 sm:px-10 py-8 flex flex-wrap gap-4 justify-between text-sm muted border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="fore-brand text-base" style={{ color: "var(--text)" }}>
          FORE
        </span>
        <div className="flex gap-4">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          <Link href="/docs/security">Security</Link>
        </div>
      </footer>
    </div>
  );
}
