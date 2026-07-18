// FORE — lib/tools/canIAfford.ts
// CONTRACT-004 in docs/CONTRACTS.md. Owner: TASK-005 (Allen, stub) -> TASK-007 (Vishvraj,
// real math behind the same interface — zero-swap, no Placeholder Replacement Note needed).
//
// Rule: the LLM MUST call this before stating any day-shift number. A number stated without a
// matching tool call is a contract violation, flagged regardless of plausibility.
//
// STATE: the TASK-005 stub has been replaced (zero-swap) — this now performs a real cross-origin
// HTTP call to the Python service's POST /can-i-afford (CONTRACT-006), server-side only.

import { callMl } from "@/lib/api/mlServer";
import type { Transaction } from "@/types/financialContext";

export interface CanIAffordInput {
  item: string;
  amount: number;
  transactions: Transaction[];
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

export async function canIAfford(input: CanIAffordInput): Promise<CanIAffordOutput> {
  const result = await callMl<CanIAffordOutput>("/can-i-afford", {
    item: input.item,
    amount: input.amount,
    transactions: input.transactions,
  });
  if (!result.ok) {
    // Surface a contract-shaped, non-crashing result the model can narrate honestly.
    return {
      affordable: false,
      day_shift: 0,
      new_zero_balance_date: "",
      explanation: `Could not verify affordability — the calculation service is unavailable (${result.error}).`,
    };
  }
  return result.data;
}
