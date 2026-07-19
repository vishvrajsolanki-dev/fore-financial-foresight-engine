import type { Transaction } from "@/types/financialContext";

export type ReportMetrics = "spend_by_category" | "spend_by_merchant" | "cashflow" | "transactions";

export type ReportPreviewInput = {
  from?: string; // YYYY-MM-DD
  to?: string;
  metrics: ReportMetrics[];
  category?: string;
  merchant?: string;
};

export type ReportPreview = {
  from: string | null;
  to: string | null;
  summary: {
    txnCount: number;
    totalSpend: number;
    totalInflow: number;
    net: number;
  };
  byCategory: { category: string; amount: number }[];
  byMerchant: { merchant: string; amount: number }[];
  cashflow: { date: string; net: number; balance: number }[];
  transactions: Transaction[];
};

function inRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/** Report builder preview — filters existing transactions only (no ML). */
export function buildReportPreview(
  transactions: Transaction[],
  input: ReportPreviewInput
): ReportPreview {
  let rows = transactions.filter((t) => inRange(t.date, input.from, input.to));
  if (input.category) {
    const c = input.category.toLowerCase();
    rows = rows.filter((t) => t.category.toLowerCase() === c);
  }
  if (input.merchant) {
    const m = input.merchant.toLowerCase();
    rows = rows.filter((t) => (t.merchant ?? "").toLowerCase().includes(m));
  }

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  let totalSpend = 0;
  let totalInflow = 0;
  const catMap = new Map<string, number>();
  const merchMap = new Map<string, number>();
  const dayMap = new Map<string, number>();

  for (const t of sorted) {
    if (t.amount < 0) {
      const amt = Math.abs(t.amount);
      totalSpend += amt;
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + amt);
      const merchant = t.merchant?.trim() || "Unknown";
      merchMap.set(merchant, (merchMap.get(merchant) ?? 0) + amt);
    } else {
      totalInflow += t.amount;
    }
    dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + t.amount);
  }

  let running = 0;
  const cashflow = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, net]) => {
      running += net;
      return { date, net, balance: running };
    });

  const metrics = input.metrics.length ? input.metrics : (["spend_by_category", "spend_by_merchant", "cashflow", "transactions"] as ReportMetrics[]);
  const wantTx = metrics.includes("transactions");
  const wantCash = metrics.includes("cashflow");
  const wantCat = metrics.includes("spend_by_category");
  const wantMerch = metrics.includes("spend_by_merchant");

  return {
    from: input.from ?? null,
    to: input.to ?? null,
    summary: {
      txnCount: sorted.length,
      totalSpend,
      totalInflow,
      net: totalInflow - totalSpend,
    },
    byCategory: wantCat
      ? [...catMap.entries()]
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
      : [],
    byMerchant: wantMerch
      ? [...merchMap.entries()]
          .map(([merchant, amount]) => ({ merchant, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 25)
      : [],
    cashflow: wantCash ? cashflow : [],
    transactions: wantTx ? sorted.slice(-200) : [],
  };
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const header = "date,category,amount,merchant,description";
  const lines = transactions.map((t) => {
    const cells = [
      t.date,
      t.category,
      String(t.amount),
      t.merchant ?? "",
      (t.description ?? "").replace(/"/g, '""'),
    ];
    return cells.map((c) => `"${c}"`).join(",");
  });
  return [header, ...lines].join("\n");
}
