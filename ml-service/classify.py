# FORE — ml-service/classify.py
# Owner: TASK-003 (Vishvraj). CONTRACT-002 in docs/CONTRACTS.md.
# Single-sample classification via Euclidean distance to 5 fixed centroids (not clustering —
# one uploaded transaction set is one sample). No ML library needed, hand-roll the distance calc.
#
# POST /classify
# Input:  { transactions: Transaction[], monthly_income: number }
# Output: { label: string, distances: Record<string, number> }

from centroids import CENTROIDS  # TASK-003: lock the 5 centroid vectors in centroids.py


def classify(transactions: list, monthly_income: float) -> dict:
    """
    TODO(TASK-003):
      1. Reduce `transactions` into the same feature vector shape as CENTROIDS
         (e.g. category-normalized spend ratios: food/shopping/bills/entertainment/savings).
      2. Compute Euclidean distance from the sample vector to each of the 5 centroids.
      3. Return the label of the nearest centroid + the full distances dict
         (CONTRACT-002 requires the entire distances object, not just the winner — Drashti's
         radar chart in TASK-002 renders all 5).
      4. Edge case: near-zero variance across categories must still return a label, no crash.
    """
    raise NotImplementedError("TASK-003: implement classify()")
