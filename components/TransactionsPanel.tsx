"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

const CATEGORIES = ["food", "shopping", "bills", "entertainment", "transfers", "income", "savings"];

export default function TransactionsPanel() {
  const { fullStackEnabled, ctx } = useFinancialContext();
  const [rows, setRows] = useState<
    { id?: string; date: string; category: string; amount: number; merchant?: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fullStackEnabled || !ctx?.session_id) {
      setRows(
        (ctx?.transactions ?? []).slice(0, 30).map((t, i) => ({
          id: `demo-${i}`,
          date: t.date,
          category: t.category,
          amount: t.amount,
          merchant: t.merchant,
        }))
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions?limit=30", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.transactions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [fullStackEnabled, ctx?.session_id, ctx?.transactions]);

  useEffect(() => {
    void load();
  }, [load]);

  async function recategorize(id: string | undefined, category: string, merchant?: string) {
    if (!fullStackEnabled || !id) return;
    const saveRule =
      merchant && window.confirm(`Always categorize "${merchant}" as ${category}?`)
        ? { matchType: "merchant" as const, pattern: merchant }
        : undefined;

    const res = await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, category, saveRule }),
    });
    if (res.ok) void load();
  }

  if (!ctx?.transactions?.length) return null;

  return (
    <div className="card">
      <p className="muted text-sm mb-3">Recent transactions — tap category to correct</p>
      {loading && <p className="muted text-sm">Loading…</p>}
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="muted text-left border-b" style={{ borderColor: "var(--border)" }}>
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Merchant</th>
              <th className="py-2 pr-2">Amount</th>
              <th className="py-2">Category</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id ?? `${t.date}-${t.amount}`} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="py-2 pr-2 whitespace-nowrap">{t.date}</td>
                <td className="py-2 pr-2 truncate max-w-[8rem]">{t.merchant || "—"}</td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  ₹{Math.abs(t.amount).toLocaleString("en-IN")}
                </td>
                <td className="py-2">
                  <select
                    className="input text-xs py-1"
                    value={t.category}
                    onChange={(e) => void recategorize(t.id, e.target.value, t.merchant)}
                    disabled={!fullStackEnabled || !t.id}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!fullStackEnabled && (
        <p className="muted text-xs mt-2">
          Sign in to persist category corrections.{" "}
          <Link href="/login" className="underline" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
