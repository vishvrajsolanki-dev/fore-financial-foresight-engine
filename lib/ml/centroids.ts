export const FEATURE_KEYS = ["food", "shopping", "bills", "entertainment", "savings"] as const;

export const CENTROIDS: Record<string, Record<(typeof FEATURE_KEYS)[number], number>> = {
  "Disciplined Saver": { food: 0.15, shopping: 0.08, bills: 0.30, entertainment: 0.05, savings: 0.42 },
  "Impulsive Spender": { food: 0.20, shopping: 0.38, bills: 0.25, entertainment: 0.14, savings: 0.03 },
  "The Foodie": { food: 0.38, shopping: 0.12, bills: 0.28, entertainment: 0.12, savings: 0.10 },
  "Social Butterfly": { food: 0.20, shopping: 0.14, bills: 0.24, entertainment: 0.32, savings: 0.10 },
  "Balanced Spender": { food: 0.20, shopping: 0.15, bills: 0.28, entertainment: 0.12, savings: 0.25 },
};
