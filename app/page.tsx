import Link from "next/link";

function HeroProductVisual() {
  return (
    <div className="mkt-hero-visual" aria-hidden>
      <div className="mkt-hero-product">
        <div className="mkt-hero-product-chrome">
          <span />
          <span />
          <span />
          <strong>FORE · Past</strong>
        </div>
        <div className="mkt-hero-product-body">
          <div className="mkt-hero-kpi">
            <small>Archetype</small>
            <b>Disciplined Saver</b>
          </div>
          <div className="mkt-hero-kpi">
            <small>Runway</small>
            <b> thr 2026</b>
          </div>
          <div className="mkt-hero-chart">
            <svg viewBox="0 0 240 80" width="100%" height="80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 55 C30 50 45 30 70 34 C95 38 110 60 140 48 C170 36 190 20 240 28 L240 80 L0 80 Z"
                fill="url(#g)"
              />
              <path
                d="M0 55 C30 50 45 30 70 34 C95 38 110 60 140 48 C170 36 190 20 240 28"
                fill="none"
                stroke="#2dd4bf"
                strokeWidth="2.5"
              />
            </svg>
          </div>
          <div className="mkt-hero-row">
            <span>Decide</span>
            <em>Can I afford ₹15,000?</em>
            <strong>Yes</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          <h1 className="display text-4xl sm:text-5xl" style={{ maxWidth: "16ch" }}>
            See your financial future clearly
          </h1>
          <p className="muted text-base sm:text-lg" style={{ maxWidth: "34ch" }}>
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
        <HeroProductVisual />
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
