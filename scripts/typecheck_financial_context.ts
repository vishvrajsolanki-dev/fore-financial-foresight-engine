/**
 * TASK-004 verification scratch — import CONTRACT-001 types and assert they compile.
 * Run: npx tsc --noEmit scripts/typecheck_financial_context.ts
 * (or via project tsconfig once next-env.d.ts exists after npm install)
 */
import type {
  ArchetypeLabel,
  BenchmarkRow,
  FinancialContext,
  PersonaDataset,
  Transaction,
} from "../types/financialContext";

const sampleTx: Transaction = {
  date: "2026-05-01",
  category: "food",
  amount: 420,
  description: "Swiggy lunch",
};

const labels: ArchetypeLabel[] = [
  "Disciplined Saver",
  "Impulsive Spender",
  "The Foodie",
  "Social Butterfly",
  "Balanced Spender",
];

const ctx: FinancialContext = {
  session_id: "demo-session-001",
  persona: "maya_foodie",
  monthly_income: 72000,
  archetype: {
    label: "The Foodie",
    distances: {
      "Disciplined Saver": 4.2,
      "Impulsive Spender": 3.1,
      "The Foodie": 1.1,
      "Social Butterfly": 2.8,
      "Balanced Spender": 2.0,
    },
  },
  burn_rate: {
    daily_avg: 850,
    trend_slope: -12.5,
    projected_zero_balance_date: "2026-09-14",
  },
  transactions: [sampleTx],
  goal: null,
  last_decide_verdict: null,
  benchmark: [{ category: "food", user_value: 12000, percentile: 72 }],
};

const persona: PersonaDataset = {
  persona: "maya_foodie",
  display_name: "Maya (The Foodie)",
  expected_archetype: "The Foodie",
  monthly_income: 72000,
  income_bracket: "₹60k–₹1L",
  city_tier: "Tier-2",
  transactions: [sampleTx],
};

const row: BenchmarkRow = {
  income_bracket: "₹60k–₹1L",
  city_tier: "Tier-2",
  categories: [
    {
      category: "food",
      percentiles: { p25: 1, p50: 2, p75: 3, p90: 4 },
    },
  ],
};

// Touch bindings so tsc keeps them under noUnusedLocals if enabled later.
void labels;
void ctx;
void persona;
void row;

export {};
