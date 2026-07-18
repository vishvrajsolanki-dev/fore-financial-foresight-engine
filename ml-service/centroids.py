# FORE — ml-service/centroids.py
# Owner: TASK-003 (Vishvraj). CONTRACT-002 in docs/CONTRACTS.md.
# LOCKED AT TASK-003 — re-tuning after lock is a breaking-change flag, re-issue every dependent
# handout (notably TASK-002's radar chart in PastPanel.tsx).
#
# Centroid values are subjective without real user data — pick defensible ratios across
# food/shopping/bills/entertainment/savings and state the reasoning in the TASK-003 commit message.

# TODO(TASK-003): fill in the exact centroid vectors, keyed by archetype label, once the feature
# vector shape (categories + normalization) is decided. Example shape (illustrative only, not real
# values yet):
#
# CENTROIDS = {
#     "Disciplined Saver":   {"food": 0.15, "shopping": 0.10, "bills": 0.30, "entertainment": 0.05, "savings": 0.40},
#     "Impulsive Spender":   {"food": 0.20, "shopping": 0.35, "bills": 0.20, "entertainment": 0.20, "savings": 0.05},
#     "The Foodie":          {"food": 0.40, "shopping": 0.15, "bills": 0.20, "entertainment": 0.15, "savings": 0.10},
#     "Social Butterfly":    {"food": 0.20, "shopping": 0.15, "bills": 0.15, "entertainment": 0.40, "savings": 0.10},
#     "Balanced Spender":    {"food": 0.22, "shopping": 0.18, "bills": 0.25, "entertainment": 0.15, "savings": 0.20},
# }

CENTROIDS: dict = {}  # TASK-003: replace with the locked, real values before Checkpoint-1
