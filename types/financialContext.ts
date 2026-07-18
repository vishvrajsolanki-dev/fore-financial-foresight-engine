// FORE — types/financialContext.ts
// CONTRACT-001 in docs/CONTRACTS.md. This is the shared data spine every face reads and writes.
// Owner: TASK-004 (Vishvraj, paired w/ Kavya). Rule: no face computes and displays a number
// without writing it back here first.

export interface Transaction {
  date: string; // ISO date
  category: string;
  amount: number;
  description?: string;
}

export interface FinancialContext {
  session_id: string;
  persona: string;
  monthly_income: number;
  archetype: {
    label:
      | "Disciplined Saver"
      | "Impulsive Spender"
      | "The Foodie"
      | "Social Butterfly"
      | "Balanced Spender";
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

// TASK-004: populate with real synthetic personas in data/personas/*.json.
// Do not hardcode a sample FinancialContext here — this file defines the shape only.
