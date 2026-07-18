"""
FORE — scripts/generate_data.py
TASK-004 (Vishvraj + Kavya). Generates the static synthetic personas + benchmark JSON ONCE,
checked into the repo. Zero runtime generation during the demo (CONTRACT-005).

Run:  python scripts/generate_data.py
Out:  data/personas/*.json  (CONTRACT-001 shape, superset with a few seed-only fields)
      data/benchmark.json   (CONTRACT-005 shape)

Transaction convention (locked with TASK-003's burn-rate model):
  amount > 0  -> money IN  (category "opening_balance" or "income")
  amount < 0  -> money OUT (category in the 5 spend buckets below)
This keeps CONTRACT-003's `{ transactions }`-only input self-sufficient: a bank-statement style
ledger of signed credits/debits is everything the regressor needs to reconstruct running balance.
The classifier (CONTRACT-002) ignores income/opening_balance rows and reads only the 5 spend buckets.
"""

import json
import os
import random
from datetime import date, timedelta

SPEND_CATEGORIES = ["food", "shopping", "bills", "entertainment", "savings"]

# Human-readable descriptions per category, for a realistic-looking ledger.
DESCRIPTIONS = {
    "food": ["Swiggy order", "Zomato dinner", "Groceries — DMart", "Cafe Coffee Day",
             "Local restaurant", "BigBasket", "Street food", "Bakery"],
    "shopping": ["Myntra", "Amazon", "Flipkart", "Zara", "Decathlon", "Electronics store"],
    "bills": ["Electricity bill", "Mobile recharge", "Broadband", "Rent share",
              "Water bill", "Gas cylinder"],
    "entertainment": ["BookMyShow", "Netflix", "Spotify", "Pub night", "Concert ticket",
                      "Gaming top-up", "Weekend trip"],
    "savings": ["SIP transfer", "RD deposit", "Emergency fund", "Gold savings"],
}

# Per-persona spec: intended archetype, income, opening liquid balance, monthly spend as a
# fraction of income, and the category split (must sum to 1.0). Splits are chosen close to the
# TASK-003 centroids so classification is unambiguous but not identical (real data has noise).
PERSONAS = [
    {
        "session_id": "persona-priya",
        "persona": "Priya — the Disciplined Saver",
        "archetype_intended": "Disciplined Saver",
        "monthly_income": 70000,
        "opening_balance": 120000,
        "spend_fraction": 0.60,      # spends 60% of income, banks the rest -> balance grows
        "income_bracket": "50k-75k",
        "city_tier": "Tier 1",
        "split": {"food": 0.16, "shopping": 0.10, "bills": 0.30, "entertainment": 0.06, "savings": 0.38},
        "seed": 11,
    },
    {
        "session_id": "persona-rahul",
        "persona": "Rahul — the Foodie",
        "archetype_intended": "The Foodie",
        "monthly_income": 55000,
        "opening_balance": 45000,
        "spend_fraction": 0.92,      # spends most of income -> modest runway
        "income_bracket": "50k-75k",
        "city_tier": "Tier 1",
        "split": {"food": 0.42, "shopping": 0.14, "bills": 0.20, "entertainment": 0.15, "savings": 0.09},
        "seed": 22,
    },
    {
        "session_id": "persona-aisha",
        "persona": "Aisha — the Impulsive Spender",
        "archetype_intended": "Impulsive Spender",
        "monthly_income": 60000,
        "opening_balance": 30000,
        "spend_fraction": 1.12,      # overspends -> balance declines, short runway
        "income_bracket": "50k-75k",
        "city_tier": "Tier 2",
        "split": {"food": 0.19, "shopping": 0.37, "bills": 0.19, "entertainment": 0.20, "savings": 0.05},
        "seed": 33,
    },
    {
        "session_id": "persona-riya",
        "persona": "Riya — the Social Butterfly",
        "archetype_intended": "Social Butterfly",
        "monthly_income": 68000,
        "opening_balance": 55000,
        "spend_fraction": 0.88,
        "income_bracket": "50k-75k",
        "city_tier": "Tier 2",
        "split": {"food": 0.18, "shopping": 0.14, "bills": 0.22, "entertainment": 0.38, "savings": 0.08},
        "seed": 44,
    },
    {
        "session_id": "persona-arjun",
        "persona": "Arjun — the Balanced Spender",
        "archetype_intended": "Balanced Spender",
        "monthly_income": 85000,
        "opening_balance": 90000,
        "spend_fraction": 0.78,
        "income_bracket": "75k-100k",
        "city_tier": "Tier 1",
        "split": {"food": 0.21, "shopping": 0.16, "bills": 0.27, "entertainment": 0.13, "savings": 0.23},
        "seed": 55,
    },
]

# Roughly how many transactions per month per category (frequency patterns differ by archetype).
FREQ = {"food": 18, "shopping": 6, "bills": 5, "entertainment": 8, "savings": 2}

MONTHS = 3
START = date(2026, 4, 1)  # 3-month window ending ~2026-06-30


def _month_starts(start: date, months: int):
    out = []
    y, m = start.year, start.month
    for _ in range(months):
        out.append(date(y, m, 1))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def _split_amount(total: float, n: int, rng: random.Random) -> list:
    """Split `total` into n positive chunks with some variance (never zero)."""
    if n <= 0:
        return []
    weights = [rng.uniform(0.6, 1.4) for _ in range(n)]
    s = sum(weights)
    return [round(total * w / s) for w in weights]


def build_persona(spec: dict) -> dict:
    rng = random.Random(spec["seed"])
    monthly_income = spec["monthly_income"]
    monthly_spend = monthly_income * spec["spend_fraction"]
    txns = []

    # Opening balance as the first ledger row.
    txns.append({
        "date": (START - timedelta(days=1)).isoformat(),
        "category": "opening_balance",
        "amount": spec["opening_balance"],
        "description": "Opening balance",
    })

    for ms in _month_starts(START, MONTHS):
        # Salary credit on the 1st of each month.
        txns.append({
            "date": ms.isoformat(),
            "category": "income",
            "amount": monthly_income,
            "description": "Monthly salary",
        })
        # Expenses per category, spread across the month.
        for cat in SPEND_CATEGORIES:
            cat_total = monthly_spend * spec["split"][cat]
            n = max(1, FREQ[cat] + rng.randint(-1, 1))
            for amt in _split_amount(cat_total, n, rng):
                if amt <= 0:
                    continue
                day = rng.randint(1, 27)
                txns.append({
                    "date": date(ms.year, ms.month, day).isoformat(),
                    "category": cat,
                    "amount": -amt,  # money out
                    "description": rng.choice(DESCRIPTIONS[cat]),
                })

    txns.sort(key=lambda t: t["date"])

    return {
        "session_id": spec["session_id"],
        "persona": spec["persona"],
        "monthly_income": monthly_income,
        "income_bracket": spec["income_bracket"],
        "city_tier": spec["city_tier"],
        "archetype_intended": spec["archetype_intended"],  # sanity-check reference, not a contract field
        "archetype": None,
        "burn_rate": None,
        "transactions": txns,
        "goal": None,
        "last_decide_verdict": None,
        "benchmark": None,
    }


# ---- CONTRACT-005 benchmark: 5 income brackets x 3 city tiers, no gaps ----
INCOME_BRACKETS = ["0-25k", "25k-50k", "50k-75k", "75k-100k", "100k+"]
CITY_TIERS = ["Tier 1", "Tier 2", "Tier 3"]
BENCH_CATEGORIES = ["food", "shopping", "bills", "entertainment", "savings"]

# Base monthly INR percentiles per category (Tier 1, mid bracket). Scaled per bracket/tier below.
BASE_PERCENTILES = {
    "food":          {"p25": 4000, "p50": 6500, "p75": 9000, "p90": 13000},
    "shopping":      {"p25": 2000, "p50": 4000, "p75": 7000, "p90": 12000},
    "bills":         {"p25": 5000, "p50": 8000, "p75": 12000, "p90": 18000},
    "entertainment": {"p25": 1500, "p50": 3000, "p75": 5500, "p90": 9000},
    "savings":       {"p25": 3000, "p50": 8000, "p75": 15000, "p90": 25000},
}
BRACKET_SCALE = {"0-25k": 0.5, "25k-50k": 0.75, "50k-75k": 1.0, "75k-100k": 1.35, "100k+": 1.8}
TIER_SCALE = {"Tier 1": 1.0, "Tier 2": 0.8, "Tier 3": 0.62}


def build_benchmark() -> list:
    rows = []
    for bracket in INCOME_BRACKETS:
        for tier in CITY_TIERS:
            scale = BRACKET_SCALE[bracket] * TIER_SCALE[tier]
            cats = []
            for cat in BENCH_CATEGORIES:
                base = BASE_PERCENTILES[cat]
                cats.append({
                    "category": cat,
                    "percentiles": {k: round(v * scale) for k, v in base.items()},
                })
            rows.append({"income_bracket": bracket, "city_tier": tier, "categories": cats})
    return rows


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    personas_dir = os.path.join(root, "data", "personas")
    os.makedirs(personas_dir, exist_ok=True)

    for spec in PERSONAS:
        p = build_persona(spec)
        path = os.path.join(personas_dir, f"{spec['session_id']}.json")
        with open(path, "w") as f:
            json.dump(p, f, indent=2)
        n_spend = sum(1 for t in p["transactions"] if t["category"] in SPEND_CATEGORIES)
        print(f"{spec['session_id']}: {len(p['transactions'])} txns ({n_spend} spend) -> {path}")

    bench = {
        "_note": "Static peer-benchmark data (CONTRACT-005). Generated once by scripts/generate_data.py, "
                 "never at runtime. 5 income brackets x 3 city tiers, no gaps.",
        "brackets": build_benchmark(),
    }
    bench_path = os.path.join(root, "data", "benchmark.json")
    with open(bench_path, "w") as f:
        json.dump(bench, f, indent=2)
    print(f"benchmark: {len(bench['brackets'])} bracket/tier rows -> {bench_path}")


if __name__ == "__main__":
    main()
