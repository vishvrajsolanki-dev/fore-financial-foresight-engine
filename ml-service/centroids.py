# FORE — ml-service/centroids.py
# Owner: TASK-003 (Vishvraj). CONTRACT-002 in docs/CONTRACTS.md.
# LOCKED AT TASK-003 — re-tuning after lock is a breaking-change flag, re-issue every dependent
# handout (notably TASK-002's radar chart in PastPanel.tsx).
#
# FEATURE VECTOR (locked with these centroids — CONTRACT-002):
#   5 dimensions, each a ratio of MONTHLY INCOME, in this order of keys:
#     food, shopping, bills, entertainment, savings
#   - food/shopping/bills/entertainment = that category's average monthly spend / monthly_income
#   - savings = max(0, 1 - total_monthly_spend / monthly_income)  (whatever isn't spent)
#   Each centroid row sums to 1.0 — a full month of income allocated across the 5 buckets.
#
# REASONING (defensible ratios, stated per the TASK-003 handout's KNOWN RISKS):
#   - Disciplined Saver : savings dominates (42%), essentials covered (bills 30%), every
#                         discretionary bucket kept lean.
#   - Impulsive Spender : shopping dominates (38%), savings near zero (3%) — the defining trait
#                         is unplanned discretionary purchases, not any one interest.
#   - The Foodie        : food is the single largest bucket (38%) — dining out + delivery +
#                         groceries well above the ~20% typical share; other buckets ordinary.
#   - Social Butterfly  : entertainment/outings dominate (32%); food kept at the typical 20%
#                         so the separation from The Foodie is on the entertainment axis.
#   - Balanced Spender  : no bucket dominates; moderate healthy savings (25%) — the centroid a
#                         typical steady spender lands nearest.

FEATURE_KEYS = ["food", "shopping", "bills", "entertainment", "savings"]

CENTROIDS: dict[str, dict[str, float]] = {
    "Disciplined Saver": {"food": 0.15, "shopping": 0.08, "bills": 0.30, "entertainment": 0.05, "savings": 0.42},
    "Impulsive Spender": {"food": 0.20, "shopping": 0.38, "bills": 0.25, "entertainment": 0.14, "savings": 0.03},
    "The Foodie":        {"food": 0.38, "shopping": 0.12, "bills": 0.28, "entertainment": 0.12, "savings": 0.10},
    "Social Butterfly":  {"food": 0.20, "shopping": 0.14, "bills": 0.24, "entertainment": 0.32, "savings": 0.10},
    "Balanced Spender":  {"food": 0.20, "shopping": 0.15, "bills": 0.28, "entertainment": 0.12, "savings": 0.25},
}
