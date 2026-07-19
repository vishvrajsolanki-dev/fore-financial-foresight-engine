import { createHash } from "crypto";

import type { Transaction } from "@/types/financialContext";

/** Stable dedupe key for ledger rows across statement uploads. */
export function transactionFingerprint(txn: Transaction): string {
  const desc = (txn.description ?? "").trim().toLowerCase();
  const merchant = (txn.merchant ?? "").trim().toLowerCase();
  const raw = [txn.date, txn.amount.toFixed(2), txn.category, merchant || desc].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function dedupeTransactions(
  incoming: Transaction[],
  existingFingerprints: Set<string>
): { unique: Transaction[]; skipped: number; fingerprints: string[] } {
  const unique: Transaction[] = [];
  const fingerprints: string[] = [];
  let skipped = 0;
  const seen = new Set(existingFingerprints);

  for (const txn of incoming) {
    const fp = transactionFingerprint(txn);
    if (seen.has(fp)) {
      skipped++;
      continue;
    }
    seen.add(fp);
    fingerprints.push(fp);
    unique.push(txn);
  }

  return { unique, skipped, fingerprints };
}
