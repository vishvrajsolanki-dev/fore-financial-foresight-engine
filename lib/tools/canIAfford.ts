// FORE — lib/tools/canIAfford.ts
// CONTRACT-004 in docs/CONTRACTS.md. Owner: TASK-005 (Allen, stub) -> TASK-007 (Vishvraj,
// real math, behind the same interface — zero-swap, no Placeholder Replacement Note needed).
//
// Rule: the LLM MUST call this before stating any day-shift number. A number stated without a
// matching tool call is a contract violation, flagged regardless of plausibility.

export interface CanIAffordInput {
  item: string;
  amount: number;
  transactions: { date: string; category: string; amount: number }[];
}

export interface CanIAffordOutput {
  affordable: boolean;
  day_shift: number;
  new_zero_balance_date: string;
  explanation: string;
}

// Tool definition passed to Groq's tool-calling API.
export const canIAffordToolDefinition = {
  type: "function" as const,
  function: {
    name: "canIAfford",
    description:
      "Determine whether the user can afford a hypothetical expense by re-running the burn-rate " +
      "regression with the expense inserted. Always call this before stating any day-shift number.",
    parameters: {
      type: "object",
      properties: {
        item: { type: "string", description: "What the user wants to buy" },
        amount: { type: "number", description: "Cost of the item in INR" },
      },
      required: ["item", "amount"],
    },
  },
};

// TASK-005: stub. Returns a plausible-shaped but fake response so tool-calling wiring can be
// verified before TASK-007's real math exists.
export async function canIAfford(
  input: CanIAffordInput
): Promise<CanIAffordOutput> {
  // TODO(TASK-007 swap): replace with POST {RENDER_ML_BASE_URL}/can-i-afford (CONTRACT-004),
  // passing input.item, input.amount, and the current financial_context's transactions.
  return {
    affordable: true,
    day_shift: 0,
    new_zero_balance_date: "1970-01-01",
    explanation: "STUB — TASK-007 has not replaced this yet.",
  };
}
