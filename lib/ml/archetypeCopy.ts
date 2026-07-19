import type { ArchetypeLabel } from "@/types/financialContext";

/** RupeeIQ-style assigned personality copy (not user-selectable). */
export const ARCHETYPE_COPY: Record<
  ArchetypeLabel,
  { blurb: string; tip: string }
> = {
  "Disciplined Saver": {
    blurb: "Your spend mix stays lean — most of your income is preserved or put toward bills/savings.",
    tip: "Keep the streak: automate a SIP the day salary lands so savings happen before discretionary spend.",
  },
  "Impulsive Spender": {
    blurb: "Shopping dominates your profile — bursts of discretionary spend pull you away from savings.",
    tip: "Try a 24-hour rule on non-essential buys over ₹1,000 and move that amount to a separate pot.",
  },
  "The Foodie": {
    blurb: "Food and dining take the largest share of your spending pattern.",
    tip: "Set a weekly food budget and track delivery apps separately — small caps compound fast.",
  },
  "Social Butterfly": {
    blurb: "Entertainment and outings define your money personality more than other categories.",
    tip: "Pre-decide a monthly social budget so hangouts stay fun without eroding runway.",
  },
  "Balanced Spender": {
    blurb: "Your category mix sits near the middle of all five profiles — no single habit dominates.",
    tip: "Protect the balance: keep savings ≥ 20% and review one discretionary category each month.",
  },
};

export function archetypeCopy(label: string) {
  return (
    ARCHETYPE_COPY[label as ArchetypeLabel] ?? {
      blurb: "Assigned from your spending mix vs five fixed centroids (Euclidean nearest neighbour).",
      tip: "Upload more months of data for a stabler assignment.",
    }
  );
}
