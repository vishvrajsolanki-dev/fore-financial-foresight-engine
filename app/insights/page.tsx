"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/shell/AppShell";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";
import { buildWeeklyBrief, type WeeklyBrief } from "@/lib/insights/weeklyBrief";

export default function InsightsPage() {
  const { ctx, fullStackEnabled, activeId } = useFinancialContext();
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId || !ctx) return;
    if (!fullStackEnabled) {
      setBrief(buildWeeklyBrief(ctx));
      return;
    }
    fetch("/api/insights/weekly")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load brief");
        setBrief(d.brief);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [activeId, ctx, fullStackEnabled]);

  return (
    <AppShell>
      <article className="rise-in max-w-2xl">
        <h1 className="display text-3xl">Insights</h1>
        <p className="muted mt-1 mb-8">Your weekly foresight brief</p>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {!brief && !error && <p className="muted">Loading brief…</p>}
        {brief && (
          <>
            <header className="mb-8">
              <h2 className="display text-2xl">{brief.title}</h2>
              <p className="muted text-sm mt-1">{brief.periodLabel}</p>
            </header>
            {brief.sections.map((s) => (
              <section key={s.id} className="mb-8">
                <h3 className="display text-xl">{s.title}</h3>
                <p className="mt-2 leading-relaxed muted" style={{ color: "var(--text)" }}>
                  {s.body}
                </p>
              </section>
            ))}
            <div className="flex flex-wrap gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              {brief.links.map((l) => (
                <Link key={l.href} href={l.href} className="btn-ghost btn text-sm">
                  {l.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </article>
    </AppShell>
  );
}
