import type { FinancialContext } from "@/types/financialContext";

const KEY = "fore_financial_context_v1";

export function saveContextToStorage(ctx: FinancialContext): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ctx));
  } catch {
    /* quota / private mode */
  }
}

export function loadContextFromStorage(): FinancialContext | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FinancialContext;
    if (!parsed?.session_id || !Array.isArray(parsed.transactions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearContextStorage(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
