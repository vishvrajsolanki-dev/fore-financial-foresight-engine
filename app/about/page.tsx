import Link from "next/link";

export default function AboutPage() {
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
      <main id="main" className="px-5 sm:px-10 py-20 max-w-2xl mx-auto">
        <h1 className="display text-4xl">About FORE</h1>
        <p className="mt-6 text-lg leading-relaxed">
          FORE is the Financial Foresight Engine — built so you can understand your past spend,
          decide what you can afford now, and stay on pace for what&apos;s ahead.
        </p>
        <p className="muted mt-4 leading-relaxed">
          We keep answers grounded in your transactions and explicit tools — not vibes.
        </p>
      </main>
    </div>
  );
}
