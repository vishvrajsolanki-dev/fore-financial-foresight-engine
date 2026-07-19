import { categorizeDescription } from "@/lib/csv/parseBankCsv";
import type { Transaction } from "@/types/financialContext";

export type CategoryRuleInput = {
  matchType: "merchant" | "contains";
  pattern: string;
  category: string;
};

const KEYWORD_CONFIDENCE = 0.72;
const RULE_CONFIDENCE = 0.95;
const DEFAULT_CONFIDENCE = 0.45;

function matchRule(txn: Transaction, rule: CategoryRuleInput): boolean {
  const pattern = rule.pattern.trim().toLowerCase();
  if (!pattern) return false;
  if (rule.matchType === "merchant") {
    return (txn.merchant ?? "").toLowerCase().includes(pattern);
  }
  const hay = `${txn.merchant ?? ""} ${txn.description ?? ""}`.toLowerCase();
  return hay.includes(pattern);
}

/** Keyword/merchant classifier with confidence; applies user CategoryRules first. */
export function classifyTransaction(
  txn: Transaction,
  rules: CategoryRuleInput[] = []
): { category: string; confidence: number; source: "rule" | "parser" | "user" } {
  for (const rule of rules) {
    if (matchRule(txn, rule)) {
      return { category: rule.category, confidence: RULE_CONFIDENCE, source: "rule" };
    }
  }

  const desc = txn.description ?? txn.merchant ?? "";
  if (desc) {
    const cat = categorizeDescription(desc);
    if (cat !== "shopping" || /swiggy|zomato|amazon|netflix|rent|salary|upi/i.test(desc)) {
      return { category: cat, confidence: KEYWORD_CONFIDENCE, source: "parser" };
    }
    return { category: cat, confidence: DEFAULT_CONFIDENCE, source: "parser" };
  }

  return { category: txn.category || "shopping", confidence: DEFAULT_CONFIDENCE, source: "parser" };
}

export function classifyTransactions(
  txns: Transaction[],
  rules: CategoryRuleInput[] = []
): (Transaction & { confidence: number; source: string })[] {
  return txns.map((txn) => {
    const { category, confidence, source } = classifyTransaction(txn, rules);
    return { ...txn, category, confidence, source };
  });
}
