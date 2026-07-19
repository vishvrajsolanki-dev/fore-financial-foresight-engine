"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/shell/AppShell";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";
import { formatMoney } from "@/lib/format/currency";

type Pulse = {
  balance: number | null;
  burnDailyAvg: number | null;
  runwayDate: string | null;
  archetypeLabel: string | null;
  lastDecideVerdict: { item: string; amount: number } | null;
  goal: { target_amount: number; target_date: string; on_pace: boolean } | null;
  alerts: { title: string; detail: string; severity: string }[];
};

export default function HomePage() {
  const { ctx, currency, fullStackEnabled, activeId } = useFinancialContext();
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    if (!fullStackEnabled) {
      const balance = ctx?.transactions?.reduce((s, t) => s + t.amount, 0) ?? null;
      setPulse({
        balance,
        burnDailyAvg: ctx?.burn_rate?.daily_avg ?? null,
        runwayDate: ctx?.burn_rate?.projected_zero_balance_date ?? null,
        archetypeLabel: ctx?.archetype?.label ?? null,
        lastDecideVerdict: ctx?.last_decide_verdict
          ? { item: ctx.last_decide_verdict.item, amount: ctx.last_decide_verdict.amount }
          : null,
        goal: ctx?.goal
          ? {
              target_amount: ctx.goal.target_amount,
              target_date: ctx.goal.target_date,
              on_pace: ctx.goal.on_pace,
            }
          : null,
        alerts: [],
      });
      return;
    }
    fetch("/api/home/pulse")
      .then((r) => r.json())
      .then((d) => setPulse(d.pulse ?? null))
      .catch(() => setPulse(null));
  }, [fullStackEnabled, ctx]);

  return (
    <AppShell>
      <div className="rise-in">
        <h1 className="display text-3xl">Home</h1>
        <p className="muted mt-1 mb-6">A quiet pulse — then dive into Past, Decide, or Ahead.</p>

        {!activeId ? (
          <div className="card text-center py-10">
            <div className="state-illustration" aria-hidden />
            <p className="display text-xl">No session yet</p>
            <Link href="/onboarding" className="btn mt-4 inline-flex">
              Start onboarding
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <p className="muted text-xs font-semibold uppercase tracking-wide">Balance</p>
              <p className="tabular text-2xl font-semibold mt-2">
                {pulse?.balance != null ? formatMoney(pulse.balance, currency) : "—"}
              </p>
            </div>
            <div className="card">
              <p className="muted text-xs font-semibold uppercase tracking-wide">Last Decide</p>
              <p className="text-lg font-semibold mt-2">
                {pulse?.lastDecideVerdict
                  ? `${pulse.lastDecideVerdict.item} · ${formatMoney(pulse.lastDecideVerdict.amount, currency)}`
                  : "No verdict yet"}
              </p>
              <Link href="/decide" className="text-sm mt-2 inline-block" style={{ color: "var(--accent)" }}>
                Ask Decide →
              </Link>
            </div>
            <div className="card">
              <p className="muted text-xs font-semibold uppercase tracking-wide">Goal pace</p>
              <p className="text-lg font-semibold mt-2">
                {pulse?.goal ? (pulse.goal.on_pace ? "On track" : "Behind pace") : "No goal set"}
              </p>
              <Link href="/ahead" className="text-sm mt-2 inline-block" style={{ color: "var(--accent)" }}>
                Open Ahead →
              </Link>
            </div>
          </div>
        )}

        {pulse?.archetypeLabel && (
          <div className="card mt-4">
            <p className="muted text-xs font-semibold uppercase tracking-wide">Archetype</p>
            <p className="display text-xl mt-1">{pulse.archetypeLabel}</p>
            <Link href="/past" className="text-sm mt-2 inline-block" style={{ color: "var(--accent)" }}>
              Review Past →
            </Link>
          </div>
        )}

        {!!pulse?.alerts?.length && (
          <div className="card mt-4">
            <p className="muted text-xs font-semibold uppercase tracking-wide mb-2">Alerts</p>
            <ul className="space-y-2 text-sm">
              {pulse.alerts.map((a) => (
                <li key={a.title}>
                  <strong>{a.title}</strong>
                  <span className="muted"> — {a.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
