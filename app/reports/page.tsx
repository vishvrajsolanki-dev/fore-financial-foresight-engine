"use client";

import { FormEvent, useState } from "react";
import AppShell from "@/components/shell/AppShell";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";
import { buildReportPreview, type ReportPreview } from "@/lib/reports/builder";
import { formatMoney } from "@/lib/format/currency";

export default function ReportsPage() {
  const { ctx, currency, fullStackEnabled } = useFinancialContext();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPreview(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!fullStackEnabled) {
        if (!ctx) throw new Error("No data");
        setPreview(
          buildReportPreview(ctx.transactions, {
            from: from || undefined,
            to: to || undefined,
            metrics: ["spend_by_category", "spend_by_merchant", "cashflow", "transactions"],
          })
        );
        return;
      }
      const res = await fetch("/api/reports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from || undefined,
          to: to || undefined,
          metrics: ["spend_by_category", "spend_by_merchant", "cashflow", "transactions"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreview(data.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    if (!fullStackEnabled) {
      if (!preview) return;
      const { transactionsToCsv } = await import("@/lib/reports/builder");
      const blob = new Blob([transactionsToCsv(preview.transactions)], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fore-report.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const res = await fetch("/api/reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: from || undefined, to: to || undefined, format: "csv" }),
    });
    if (!res.ok) {
      setError("Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fore-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <h1 className="display text-3xl">Reports</h1>
      <p className="muted mt-1 mb-6">Builder — configure, preview, export.</p>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <form className="card grid gap-3 h-fit" onSubmit={onPreview}>
          <label className="grid gap-1 text-sm">
            From
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            To
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "Building…" : "Generate preview"}
          </button>
          <button type="button" className="btn-ghost btn" disabled={!preview} onClick={onExport}>
            Export CSV
          </button>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
        </form>

        <div className="grid gap-4">
          {preview ? (
            <>
              <div className="card grid sm:grid-cols-4 gap-3">
                <div>
                  <p className="muted text-xs">Transactions</p>
                  <p className="tabular text-xl font-semibold">{preview.summary.txnCount}</p>
                </div>
                <div>
                  <p className="muted text-xs">Spend</p>
                  <p className="tabular text-xl font-semibold">{formatMoney(preview.summary.totalSpend, currency)}</p>
                </div>
                <div>
                  <p className="muted text-xs">Inflow</p>
                  <p className="tabular text-xl font-semibold">{formatMoney(preview.summary.totalInflow, currency)}</p>
                </div>
                <div>
                  <p className="muted text-xs">Net</p>
                  <p className="tabular text-xl font-semibold">{formatMoney(preview.summary.net, currency)}</p>
                </div>
              </div>
              <div className="card">
                <h2 className="font-semibold mb-3">Spend by category</h2>
                <ul className="text-sm space-y-1">
                  {preview.byCategory.slice(0, 8).map((r) => (
                    <li key={r.category} className="flex justify-between gap-4">
                      <span>{r.category}</span>
                      <span className="tabular">{formatMoney(r.amount, currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <div className="state-illustration" aria-hidden />
              <p className="muted">Configure filters and generate a preview.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
