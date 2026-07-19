import type { Transaction } from "@/types/financialContext";

export type MerchantSummary = {
  merchant: string;
  txnCount: number;
  totalSpend: number;
  totalInflow: number;
  categories: Record<string, number>;
  firstDate: string | null;
  lastDate: string | null;
  transactions: Transaction[];
};

function norm(m: string): string {
  return m.trim().toLowerCase();
}

export function aggregateMerchant(
  transactions: Transaction[],
  merchantQuery: string,
  limit = 50
): MerchantSummary | null {
  const q = norm(merchantQuery);
  if (!q) return null;

  const matched = transactions.filter((t) => {
    const m = t.merchant?.trim();
    if (!m) return false;
    return norm(m) === q || norm(m).includes(q);
  });

  if (!matched.length) return null;

  const canonical =
    matched.find((t) => t.merchant && norm(t.merchant) === q)?.merchant?.trim() ||
    matched[0].merchant!.trim();

  let totalSpend = 0;
  let totalInflow = 0;
  const categories: Record<string, number> = {};
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  for (const t of matched) {
    if (t.amount < 0) totalSpend += Math.abs(t.amount);
    else totalInflow += t.amount;
    categories[t.category] = (categories[t.category] ?? 0) + Math.abs(t.amount);
    if (!firstDate || t.date < firstDate) firstDate = t.date;
    if (!lastDate || t.date > lastDate) lastDate = t.date;
  }

  const sorted = [...matched].sort((a, b) => b.date.localeCompare(a.date));

  return {
    merchant: canonical,
    txnCount: matched.length,
    totalSpend,
    totalInflow,
    categories,
    firstDate,
    lastDate,
    transactions: sorted.slice(0, limit),
  };
}

export function listMerchants(
  transactions: Transaction[],
  limit = 40
): { merchant: string; txnCount: number; totalSpend: number }[] {
  const map = new Map<string, { merchant: string; txnCount: number; totalSpend: number }>();
  for (const t of transactions) {
    const m = t.merchant?.trim();
    if (!m) continue;
    const key = norm(m);
    const cur = map.get(key) ?? { merchant: m, txnCount: 0, totalSpend: 0 };
    cur.txnCount += 1;
    if (t.amount < 0) cur.totalSpend += Math.abs(t.amount);
    map.set(key, cur);
  }
  return [...map.values()]
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);
}
