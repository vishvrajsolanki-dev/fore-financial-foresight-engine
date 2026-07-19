import { z } from "zod";

import { computeBenchmark } from "@/lib/benchmark/computeBenchmark";
import { canIAffordMath } from "@/lib/ml/canIAfford";
import { computeBurnRate } from "@/lib/ml/burnRate";
import { prisma } from "@/lib/db/prisma";
import { decryptField } from "@/lib/security/encryption";
import type { FinancialContext, Transaction } from "@/types/financialContext";
import { computeGoal } from "@/lib/ahead/goalMath";

export const chatTools = [
  {
    type: "function" as const,
    function: {
      name: "canIAfford",
      description: "Compute whether a purchase is affordable from the user's transactions.",
      parameters: {
        type: "object",
        properties: {
          item: { type: "string" },
          amount: { type: "number" },
        },
        required: ["item", "amount"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSpendByCategory",
      description: "Sum absolute spend by category over the statement window.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getBurnRate",
      description: "Return daily spend average, trend slope, and projected zero-balance date.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getGoalStatus",
      description: "Return the current savings goal and pace, if set.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "setGoal",
      description: "Set or update a savings goal target amount and ISO date.",
      parameters: {
        type: "object",
        properties: {
          target_amount: { type: "number" },
          target_date: { type: "string" },
        },
        required: ["target_amount", "target_date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "searchTransactions",
      description: "Search recent transactions by merchant/description substring (max 20).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          allow_descriptions: { type: "boolean" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getBenchmark",
      description: "Return peer-benchmark percentiles for the user's categories (modeled peers).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

export type ToolContext = {
  userId: string;
  sessionId: string;
  transactions: Transaction[];
  spine: {
    monthly_income: number;
    income_bracket?: string;
    city_tier?: string;
    goal: FinancialContext["goal"];
    burn_rate: FinancialContext["burn_rate"];
    benchmark: FinancialContext["benchmark"];
    archetype: FinancialContext["archetype"];
  };
};

const affordArgs = z.object({ item: z.string(), amount: z.number().finite() });
const setGoalArgs = z.object({
  target_amount: z.number().finite().positive(),
  target_date: z.string().min(4),
});
const searchArgs = z.object({
  query: z.string().min(1).max(80),
  allow_descriptions: z.boolean().optional(),
});

export async function executeTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  try {
    switch (name) {
      case "canIAfford": {
        const args = affordArgs.parse(rawArgs);
        return { ok: true, result: canIAffordMath(args.item, args.amount, ctx.transactions) };
      }
      case "getSpendByCategory": {
        const totals: Record<string, number> = {};
        for (const t of ctx.transactions) {
          if (t.amount < 0) {
            totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
          }
        }
        return { ok: true, result: totals };
      }
      case "getBurnRate": {
        return { ok: true, result: computeBurnRate(ctx.transactions) };
      }
      case "getGoalStatus": {
        return { ok: true, result: ctx.spine.goal };
      }
      case "setGoal": {
        const args = setGoalArgs.parse(rawArgs);
        const burn = ctx.spine.burn_rate?.daily_avg ?? computeBurnRate(ctx.transactions).daily_avg;
        const goal = computeGoal(args.target_amount, args.target_date, ctx.spine.monthly_income, burn);
        await prisma.financialSession.updateMany({
          where: { id: ctx.sessionId, userId: ctx.userId, isActive: true },
          data: { goal: goal ?? undefined },
        });
        return { ok: true, result: goal };
      }
      case "searchTransactions": {
        const args = searchArgs.parse(rawArgs);
        const q = args.query.toLowerCase();
        const rows = await prisma.transaction.findMany({
          where: { sessionId: ctx.sessionId, session: { userId: ctx.userId } },
          orderBy: { date: "desc" },
          take: 200,
        });
        const hits = rows
          .filter((r) => {
            const merchant = (r.merchant || "").toLowerCase();
            if (merchant.includes(q)) return true;
            if (!args.allow_descriptions || !r.descriptionEnc) return false;
            try {
              return decryptField(r.descriptionEnc).toLowerCase().includes(q);
            } catch {
              return false;
            }
          })
          .slice(0, 20)
          .map((r) => ({
            date: r.date,
            category: r.category,
            amount: r.amount,
            merchant: r.merchant,
            description: args.allow_descriptions && r.descriptionEnc ? decryptField(r.descriptionEnc) : undefined,
          }));
        return { ok: true, result: hits };
      }
      case "getBenchmark": {
        if (ctx.spine.benchmark) return { ok: true, result: ctx.spine.benchmark };
        const bracket = ctx.spine.income_bracket || "50k-75k";
        const tier = ctx.spine.city_tier || "Tier 2";
        return {
          ok: true,
          result: {
            note: "Modeled peer percentiles (synthetic tables), not a live survey.",
            rows: computeBenchmark(ctx.transactions, bracket, tier),
          },
        };
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Tool failed" };
  }
}
