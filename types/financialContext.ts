// FORE — types/financialContext.ts
// CONTRACT-001 in docs/CONTRACTS.md. This is the shared data spine every face reads and writes.
// Owner: TASK-004 (Vishvraj, paired w/ Kavya). Rule: no face computes and displays a number
// without writing it back here first.

/** Spend categories used by personas, classifier centroids, and benchmark JSON. */
export type SpendCategory =
  | "food"
  | "shopping"
  | "bills"
  | "entertainment"
  | "savings";

export type ArchetypeLabel =
  | "Disciplined Saver"
  | "Impulsive Spender"
  | "The Foodie"
  | "Social Butterfly"
  | "Balanced Spender";

export interface Transaction {
  date: string; // ISO date (YYYY-MM-DD)
  category: SpendCategory | string;
  /** Signed INR: positive = credit/inflow, negative = debit/outflow. */
  amount: number;
  description?: string;
  /** Best-effort merchant token extracted from the bank narration (optional). */
  merchant?: string;
}

/**
 * CONTRACT-001 — financial_context object (the spine).
 * Locked by TASK-004. Consumed by every task.
 */
export interface FinancialContext {
  session_id: string;
  persona: string;
  monthly_income: number;
  archetype: {
    label: ArchetypeLabel;
    distances: Record<string, number>;
  } | null;
  burn_rate: {
    daily_avg: number;
    trend_slope: number;
    projected_zero_balance_date: string;
  } | null;
  transactions: Transaction[];
  goal: {
    target_amount: number;
    target_date: string;
    on_pace: boolean;
    pace_gap_days: number | null;
  } | null;
  last_decide_verdict: {
    item: string;
    amount: number;
    day_shift: number;
    new_zero_balance_date: string;
  } | null;
  benchmark:
    | { category: string; user_value: number; percentile: number }[]
    | null;
}

/**
 * CONTRACT-005 — one row of the static benchmark JSON (data/benchmark.json).
 * File is an array covering all 5 income brackets × 3 city tiers.
 */
export interface BenchmarkRow {
  income_bracket: string;
  city_tier: string;
  categories: {
    category: string;
    percentiles: { p25: number; p50: number; p75: number; p90: number };
  }[];
}

/** Shape of a checked-in persona file under data/personas/*.json */
export interface PersonaDataset {
  persona: string;
  display_name: string;
  /** Intended nearest archetype for TASK-003 sanity checks (not computed at runtime). */
  expected_archetype: ArchetypeLabel;
  monthly_income: number;
  income_bracket: string;
  city_tier: string;
  /** Authoring metadata from the generator — optional for consumers. */
  category_weights?: Record<SpendCategory, number>;
  transaction_count?: number;
  transactions: Transaction[];
}
