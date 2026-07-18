# FORE — ml-service/classify.py
# Owner: TASK-003 (Vishvraj). CONTRACT-002 in docs/CONTRACTS.md.
# Single-sample classification via Euclidean distance to 5 fixed centroids (not clustering —
# one uploaded transaction set is one sample). No ML library needed, hand-rolled distance calc.
#
# POST /classify
# Input:  { transactions: Transaction[], monthly_income: number }
# Output: { label: string, distances: Record<string, number> }

import math

from centroids import CENTROIDS, FEATURE_ORDER

# Rows that are credits / bookkeeping, not consumption — excluded from the spend profile.
NON_SPEND_CATEGORIES = {"income", "opening_balance", "salary", "refund"}


def _feature_vector(transactions: list) -> dict:
    """Reduce a transaction list to normalized spend shares over FEATURE_ORDER."""
    totals = {cat: 0.0 for cat in FEATURE_ORDER}
    for t in transactions:
        cat = t.get("category")
        if cat in NON_SPEND_CATEGORIES or cat not in totals:
            continue
        totals[cat] += abs(float(t.get("amount", 0)))

    grand = sum(totals.values())
    if grand <= 0:
        # Edge case: no spend at all -> uniform vector, still classifiable, no divide-by-zero.
        return {cat: 1.0 / len(FEATURE_ORDER) for cat in FEATURE_ORDER}
    return {cat: totals[cat] / grand for cat in FEATURE_ORDER}


def _euclidean(a: dict, b: dict) -> float:
    return math.sqrt(sum((a[cat] - b[cat]) ** 2 for cat in FEATURE_ORDER))


def classify(transactions: list, monthly_income: float) -> dict:
    """
    1. Reduce transactions to the 5-bucket normalized spend vector.
    2. Compute Euclidean distance to each of the 5 locked centroids.
    3. Return the nearest centroid's label + the FULL distances dict (CONTRACT-002 requires all 5,
       Drashti's radar chart renders every one).
    4. Near-zero variance still returns a label (nearest wins), never crashes.
    """
    sample = _feature_vector(transactions)
    distances = {label: round(_euclidean(sample, centroid), 4) for label, centroid in CENTROIDS.items()}
    label = min(distances, key=distances.get)
    return {"label": label, "distances": distances}
