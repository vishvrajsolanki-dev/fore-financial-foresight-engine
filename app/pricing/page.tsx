"use client";

import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";

export default function PricingPage() {
  const plans = Object.values(PLANS);
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
      <main id="main" className="px-5 sm:px-10 py-16 max-w-5xl mx-auto">
        <h1 className="display text-4xl text-center">Pricing</h1>
        <p className="muted text-center mt-3 mb-12">Sparse, clear, no surprises.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className="card"
              style={p.id === "pro" ? { borderColor: "var(--accent)", boxShadow: "var(--shadow-hover)" } : undefined}
            >
              <h2 className="display text-2xl">{p.name}</h2>
              <p className="tabular text-3xl mt-2 font-semibold">
                ₹{p.priceMonthlyInr}
                <span className="text-sm muted font-normal">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm muted">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Link href="/register" className="btn mt-6 w-full">
                {p.id === "free" ? "Start free" : "Get started"}
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
