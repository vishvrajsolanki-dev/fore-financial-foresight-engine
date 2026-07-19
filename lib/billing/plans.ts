export type PlanId = "free" | "pro" | "business";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceMonthlyInr: number;
  features: string[];
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyInr: 0,
    features: ["Past · Decide · Ahead", "CSV upload", "Demo personas", "Weekly brief"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyInr: 499,
    features: ["Everything in Free", "Report builder exports", "Priority Decide", "Evening theme sync"],
  },
  business: {
    id: "business",
    name: "Business",
    priceMonthlyInr: 1499,
    features: ["Everything in Pro", "Multi-statement history", "Priority support"],
  },
};

export function isPlanId(v: string): v is PlanId {
  return v === "free" || v === "pro" || v === "business";
}

/**
 * Local/dev billing: plan changes are recorded in Postgres.
 * When STRIPE_SECRET_KEY is set later, checkout can replace this path without
 * changing ML or session finance logic.
 */
export function billingMode(): "local" | "stripe" {
  return process.env.STRIPE_SECRET_KEY?.trim() ? "stripe" : "local";
}
