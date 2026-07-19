# FORE — ml-service/classify.py
# Owner: TASK-003 (Vishvraj). CONTRACT-002 in docs/CONTRACTS.md.
# Single-sample classification via Euclidean distance to 5 fixed centroids (not clustering —
# one uploaded transaction set is one sample). No ML library needed, hand-rolled distance calc.
#
# POST /classify
# Input:  { transactions: Transaction[], monthly_income: number }
# Output: { label: string, distances: Record<string, number> }

import math
from datetime import date

from centroids import CENTROIDS, FEATURE_KEYS

# Transaction categories folded into the 5 locked feature buckets. Unknown categories are
# treated as discretionary shopping — the safest bucket for an unrecognized purchase.
_CATEGORY_MAP = {
    "food": "food",
    "dining": "food",
    "groceries": "food",
    "restaurant": "food",
    "restaurants": "food",
    "delivery": "food",
    "cafe": "food",
    "shopping": "shopping",
    "clothes": "shopping",
    "clothing": "shopping",
    "electronics": "shopping",
    "online shopping": "shopping",
    "bills": "bills",
    "rent": "bills",
    "utilities": "bills",
    "emi": "bills",
    "insurance": "bills",
    "recharge": "bills",
    "transport": "bills",
    "commute": "bills",
    "fuel": "bills",
    "health": "bills",
    "education": "bills",
    "entertainment": "entertainment",
    "movies": "entertainment",
    "outings": "entertainment",
    "events": "entertainment",
    "subscriptions": "entertainment",
    "travel": "entertainment",
    "gaming": "entertainment",
    # Explicit savings transactions (TASK-004's personas record these as a first-class
    # category — money set aside, not consumed). Counted directly into the savings bucket.
    "savings": "savings",
    "investment": "savings",
    "investments": "savings",
    "sip": "savings",
    "mutual fund": "savings",
    "deposit": "savings",
    "fd": "savings",
    "rd": "savings",
}

# Credits (money in) are excluded from spend buckets — see burn_rate.py for the same convention.
_CREDIT_CATEGORIES = {
    "income",
    "salary",
    "credit",
    "refund",
    "cashback",
    "opening_balance",
    "transfers",  # P2P UPI — exclude from spend archetype ratios
}

_AVG_DAYS_PER_MONTH = 30.44


def _parse_date(value: str) -> date:
    return date.fromisoformat(str(value)[:10])


def build_feature_vector(transactions: list, monthly_income: float) -> dict:
    """Reduce one transaction set into the locked 5-dim feature vector (ratios of monthly income).

    food/shopping/bills/entertainment = category's average monthly spend / monthly_income.
    savings = max(0, 1 - total_monthly_spend / monthly_income) — whatever isn't spent.
    """
    if monthly_income <= 0:
        raise ValueError("monthly_income must be a positive number")

    buckets = {key: 0.0 for key in FEATURE_KEYS}
    dates: list[date] = []
    for txn in transactions:
        category = str(txn.get("category", "")).strip().lower()
        amount = float(txn.get("amount", 0))
        if category in _CREDIT_CATEGORIES:
            continue
        # Both persona conventions in data/personas/ must classify identically: TASK-004's
        # files record spends as positive amounts, the persona-*.json files record them as
        # negative (signed) amounts. Spend magnitude is what the feature vector measures.
        bucket = _CATEGORY_MAP.get(category, "shopping")
        buckets[bucket] += abs(amount)
        try:
            dates.append(_parse_date(txn["date"]))
        except (KeyError, ValueError, TypeError):
            pass

    # Window length in months, floored at 1 so a sparse/short sample doesn't extrapolate wildly.
    if dates:
        window_days = (max(dates) - min(dates)).days + 1
        months = max(window_days / _AVG_DAYS_PER_MONTH, 1.0)
    else:
        months = 1.0

    vector = {key: (buckets[key] / months) / monthly_income for key in FEATURE_KEYS if key != "savings"}
    vector["savings"] = max(0.0, 1.0 - sum(vector.values()))
    return vector


def classify(transactions: list, monthly_income: float) -> dict:
    """CONTRACT-002: nearest centroid by Euclidean distance, full distances dict returned
    (Drashti's radar chart in TASK-002 renders all 5, not just the winner).

    Near-zero variance across categories still returns a label — min() over a fixed dict of
    finite distances always resolves, ties break on the locked centroid ordering.
    """
    sample = build_feature_vector(transactions, monthly_income)

    distances = {
        label: round(
            math.sqrt(sum((sample[key] - centroid[key]) ** 2 for key in FEATURE_KEYS)),
            4,
        )
        for label, centroid in CENTROIDS.items()
    }
    label = min(distances, key=distances.get)  # type: ignore[arg-type]
    return {"label": label, "distances": distances}
