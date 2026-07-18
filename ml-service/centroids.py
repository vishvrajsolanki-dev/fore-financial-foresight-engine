# FORE — ml-service/centroids.py
# Owner: TASK-003 (Vishvraj). CONTRACT-002 in docs/CONTRACTS.md.
# LOCKED AT TASK-003 — re-tuning after lock is a breaking-change flag, re-issue every dependent
# handout (notably TASK-002's radar chart in PastPanel.tsx).
#
# Feature vector = share of monthly spend across 5 buckets, in this fixed order:
#   [food, shopping, bills, entertainment, savings]  (values sum to 1.0)
#
# Reasoning for the locked ratios (subjective without real user data, stated per the handout):
#   - Disciplined Saver : lowest discretionary (shopping/entertainment), highest savings share.
#   - Impulsive Spender : highest shopping + entertainment, near-zero savings.
#   - The Foodie        : food dominates, everything else moderate.
#   - Social Butterfly  : entertainment/social dominates, food high, savings low.
#   - Balanced Spender  : even spread, moderate savings — the "no strong signal" centroid.

FEATURE_ORDER = ["food", "shopping", "bills", "entertainment", "savings"]

CENTROIDS: dict = {
    "Disciplined Saver": {"food": 0.15, "shopping": 0.10, "bills": 0.30, "entertainment": 0.05, "savings": 0.40},
    "Impulsive Spender": {"food": 0.20, "shopping": 0.35, "bills": 0.20, "entertainment": 0.20, "savings": 0.05},
    "The Foodie":        {"food": 0.42, "shopping": 0.15, "bills": 0.20, "entertainment": 0.14, "savings": 0.09},
    "Social Butterfly":  {"food": 0.22, "shopping": 0.15, "bills": 0.15, "entertainment": 0.38, "savings": 0.10},
    "Balanced Spender":  {"food": 0.22, "shopping": 0.18, "bills": 0.25, "entertainment": 0.15, "savings": 0.20},
}
