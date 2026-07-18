#!/usr/bin/env python3
"""
TASK-004 one-shot generator — produces static JSON checked into the repo.
Not imported at runtime. Re-run only if demo datasets need regeneration.
"""

from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PERSONAS_DIR = ROOT / "data" / "personas"
BENCHMARK_PATH = ROOT / "data" / "benchmark.json"

INCOME_BRACKETS = [
    "Under ₹30k",
    "₹30k–₹60k",
    "₹60k–₹1L",
    "₹1L–₹2L",
    "₹2L+",
]
CITY_TIERS = ["Tier-1", "Tier-2", "Tier-3"]
CATEGORIES = ["food", "shopping", "bills", "entertainment", "savings"]

# Monthly spend baselines (INR) at p50 for Tier-2 mid bracket; scaled by bracket × city.
BASE_P50 = {
    "food": 9000,
    "shopping": 5000,
    "bills": 8000,
    "entertainment": 4000,
    "savings": 10000,
}

BRACKET_SCALE = {
    "Under ₹30k": 0.45,
    "₹30k–₹60k": 0.75,
    "₹60k–₹1L": 1.0,
    "₹1L–₹2L": 1.55,
    "₹2L+": 2.4,
}

CITY_SCALE = {
    "Tier-1": 1.25,
    "Tier-2": 1.0,
    "Tier-3": 0.8,
}

# Three months ending mid-July 2026 (demo window).
WINDOW_START = date(2026, 4, 18)
WINDOW_END = date(2026, 7, 17)


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def make_tx(
    rng: random.Random,
    day: date,
    category: str,
    amount: float,
    descriptions: list[str],
) -> dict:
    return {
        "date": day.isoformat(),
        "category": category,
        "amount": round(amount, 2),
        "description": rng.choice(descriptions),
    }


def generate_persona(
    *,
    seed: int,
    persona: str,
    display_name: str,
    expected_archetype: str,
    monthly_income: int,
    income_bracket: str,
    city_tier: str,
    # Relative category weight + events-per-month targets (visibly different patterns).
    weights: dict[str, float],
    events_per_month: dict[str, tuple[int, int]],
    amount_ranges: dict[str, tuple[float, float]],
    descriptions: dict[str, list[str]],
) -> dict:
    rng = random.Random(seed)
    months = 3
    transactions: list[dict] = []

    # Bills: ~1 rent/utilities pulse early each month + a few smaller bill hits.
    # Savings: few large transfers (savers) vs rare tiny ones (spenders).
    for month_offset in range(months):
        month_start = date(WINDOW_START.year, WINDOW_START.month, 1)
        # advance months carefully
        m = WINDOW_START.month + month_offset
        y = WINDOW_START.year + (m - 1) // 12
        m = (m - 1) % 12 + 1
        month_start = date(y, m, 1)
        if month_start.month == 12:
            month_end = date(y + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(y, m + 1, 1) - timedelta(days=1)
        month_start = max(month_start, WINDOW_START)
        month_end = min(month_end, WINDOW_END)
        days = [d for d in daterange(month_start, month_end)]
        if not days:
            continue

        for category in CATEGORIES:
            lo, hi = events_per_month[category]
            count = rng.randint(lo, hi)
            # Prefer weekends for entertainment/food for social/foodie personas via weight bias.
            for _ in range(count):
                if category in ("entertainment", "food") and weights.get(category, 0) >= 0.3:
                    weekend_days = [d for d in days if d.weekday() >= 5]
                    pool = weekend_days if weekend_days and rng.random() < 0.65 else days
                elif category == "bills":
                    # Front-load bills in first 7 days of month.
                    early = [d for d in days if d.day <= 7]
                    pool = early if early else days
                elif category == "savings":
                    # Mid-month salary allocation day bias.
                    mid = [d for d in days if 1 <= d.day <= 5]
                    pool = mid if mid else days
                else:
                    pool = days
                day = rng.choice(pool)
                amin, amax = amount_ranges[category]
                # Slight amount jitter; keep category distinctness.
                amount = rng.uniform(amin, amax)
                # Scale shopping/food a bit by income so burn rates feel realistic.
                amount *= monthly_income / 75000
                transactions.append(
                    make_tx(rng, day, category, amount, descriptions[category])
                )

    transactions.sort(key=lambda t: (t["date"], t["category"], t["amount"]))

    # Sanity: keep roughly 100–150.
    # If over, drop random low-signal shopping/food extras while preserving distinctness.
    if len(transactions) > 150:
        # Prefer dropping from the densest category for this persona's non-signature spend.
        signature = max(weights, key=weights.get)
        drop_candidates = [
            i
            for i, t in enumerate(transactions)
            if t["category"] != signature and t["category"] != "bills"
        ]
        rng.shuffle(drop_candidates)
        drop_set = set(drop_candidates[: len(transactions) - 150])
        transactions = [t for i, t in enumerate(transactions) if i not in drop_set]

    return {
        "persona": persona,
        "display_name": display_name,
        "expected_archetype": expected_archetype,
        "monthly_income": monthly_income,
        "income_bracket": income_bracket,
        "city_tier": city_tier,
        "category_weights": weights,
        "transaction_count": len(transactions),
        "transactions": transactions,
    }


DESCRIPTIONS = {
    "food": [
        "Swiggy lunch",
        "Zomato dinner",
        "Cafe latte",
        "Grocery run",
        "Office canteen",
        "Street chaat",
        "Weekend brunch",
        "Meal kit",
    ],
    "shopping": [
        "Amazon order",
        "Myntra haul",
        "Local market",
        "Electronics accessory",
        "Home essentials",
        "Impulse cart",
    ],
    "bills": [
        "Rent / EMI",
        "Electricity bill",
        "Mobile + broadband",
        "Insurance premium",
        "Society maintenance",
        "Water bill",
    ],
    "entertainment": [
        "Movie tickets",
        "Concert / gig",
        "Streaming renewals",
        "Weekend outing",
        "Gaming top-up",
        "Club / hangout",
    ],
    "savings": [
        "SIP transfer",
        "FD top-up",
        "Emergency fund",
        "Liquid fund sweep",
        "Recurring deposit",
    ],
}


def build_personas() -> list[dict]:
    # Amounts are tuned so signature-category SHARE of total spend matches centroid intent.
    # Frequency patterns also differ: Foodie ≈ daily food; Saver sparse discretionary + chunky
    # savings transfers; Social weekend entertainment spikes.

    # Persona A — The Foodie: dense food events, moderate other spend, weak savings.
    foodie = generate_persona(
        seed=104,
        persona="maya_foodie",
        display_name="Maya (The Foodie)",
        expected_archetype="The Foodie",
        monthly_income=72000,
        income_bracket="₹60k–₹1L",
        city_tier="Tier-2",
        weights={
            "food": 0.40,
            "shopping": 0.15,
            "bills": 0.20,
            "entertainment": 0.15,
            "savings": 0.10,
        },
        events_per_month={
            "food": (30, 36),  # almost daily
            "shopping": (4, 6),
            "bills": (3, 4),
            "entertainment": (4, 6),
            "savings": (1, 2),
        },
        amount_ranges={
            "food": (350, 1200),
            "shopping": (600, 2200),
            "bills": (800, 4500),
            "entertainment": (250, 1200),
            "savings": (1500, 4000),
        },
        descriptions=DESCRIPTIONS,
    )

    # Persona B — Disciplined Saver: thrifty meals, rare fun, large early-month savings.
    saver = generate_persona(
        seed=221,
        persona="arjun_saver",
        display_name="Arjun (Disciplined Saver)",
        expected_archetype="Disciplined Saver",
        monthly_income=95000,
        income_bracket="₹60k–₹1L",
        city_tier="Tier-1",
        weights={
            "food": 0.15,
            "shopping": 0.10,
            "bills": 0.30,
            "entertainment": 0.05,
            "savings": 0.40,
        },
        events_per_month={
            "food": (18, 22),  # home cooking bias — smaller ticket, still enough rows
            "shopping": (2, 4),
            "bills": (5, 6),
            "entertainment": (2, 3),
            "savings": (4, 5),  # multiple allocation transfers
        },
        amount_ranges={
            "food": (80, 280),
            "shopping": (400, 1200),
            "bills": (1500, 6500),
            "entertainment": (150, 500),
            "savings": (8000, 16000),
        },
        descriptions=DESCRIPTIONS,
    )

    # Persona C — Social Butterfly: weekend entertainment spikes, social dining, thin savings.
    social = generate_persona(
        seed=337,
        persona="riya_social",
        display_name="Riya (Social Butterfly)",
        expected_archetype="Social Butterfly",
        monthly_income=68000,
        income_bracket="₹60k–₹1L",
        city_tier="Tier-2",
        weights={
            "food": 0.20,
            "shopping": 0.15,
            "bills": 0.15,
            "entertainment": 0.40,
            "savings": 0.10,
        },
        events_per_month={
            "food": (16, 20),
            "shopping": (4, 6),
            "bills": (3, 4),
            "entertainment": (14, 18),  # dense weekend social calendar
            "savings": (1, 2),
        },
        amount_ranges={
            "food": (180, 650),
            "shopping": (500, 2200),
            "bills": (700, 3500),
            "entertainment": (600, 2800),
            "savings": (1000, 3000),
        },
        descriptions=DESCRIPTIONS,
    )

    return [foodie, saver, social]


def build_benchmark() -> list[dict]:
    rows = []
    for bracket in INCOME_BRACKETS:
        for tier in CITY_TIERS:
            scale = BRACKET_SCALE[bracket] * CITY_SCALE[tier]
            cats = []
            for category in CATEGORIES:
                p50 = BASE_P50[category] * scale
                cats.append(
                    {
                        "category": category,
                        "percentiles": {
                            "p25": round(p50 * 0.72, 2),
                            "p50": round(p50, 2),
                            "p75": round(p50 * 1.35, 2),
                            "p90": round(p50 * 1.75, 2),
                        },
                    }
                )
            rows.append(
                {
                    "income_bracket": bracket,
                    "city_tier": tier,
                    "categories": cats,
                }
            )
    return rows


def category_share(persona: dict) -> dict[str, float]:
    totals = {c: 0.0 for c in CATEGORIES}
    for t in persona["transactions"]:
        totals[t["category"]] += t["amount"]
    spent = sum(totals.values()) or 1.0
    return {c: round(v / spent, 3) for c, v in totals.items()}


def main() -> None:
    PERSONAS_DIR.mkdir(parents=True, exist_ok=True)
    personas = build_personas()
    for p in personas:
        path = PERSONAS_DIR / f"{p['persona']}.json"
        # Drop helper weight field from on-disk contract-facing payload? Keep metadata —
        # consumers use transactions + income; extras are documentation for TASK-003.
        path.write_text(json.dumps(p, indent=2) + "\n", encoding="utf-8")
        shares = category_share(p)
        print(
            f"{p['persona']}: n={p['transaction_count']} "
            f"expected={p['expected_archetype']} shares={shares}"
        )
        assert 100 <= p["transaction_count"] <= 150, p["transaction_count"]

    # Distinctness check — signature category must dominate differently across personas.
    shares = {p["persona"]: category_share(p) for p in personas}
    assert shares["maya_foodie"]["food"] == max(shares["maya_foodie"].values())
    assert shares["arjun_saver"]["savings"] == max(shares["arjun_saver"].values())
    assert shares["riya_social"]["entertainment"] == max(shares["riya_social"].values())
    assert shares["maya_foodie"]["food"] > shares["arjun_saver"]["food"]
    assert shares["arjun_saver"]["savings"] > shares["maya_foodie"]["savings"]
    assert shares["riya_social"]["entertainment"] > shares["maya_foodie"]["entertainment"]
    assert shares["riya_social"]["entertainment"] > shares["arjun_saver"]["entertainment"]
    # Frequency distinctness: Foodie has far more food txns; Social far more entertainment.
    def count_cat(p: dict, cat: str) -> int:
        return sum(1 for t in p["transactions"] if t["category"] == cat)

    by_id = {p["persona"]: p for p in personas}
    assert count_cat(by_id["maya_foodie"], "food") > count_cat(by_id["arjun_saver"], "food") + 20
    assert count_cat(by_id["riya_social"], "entertainment") > count_cat(
        by_id["maya_foodie"], "entertainment"
    ) + 15

    benchmark = build_benchmark()
    assert len(benchmark) == 15
    pairs = {(r["income_bracket"], r["city_tier"]) for r in benchmark}
    assert len(pairs) == 15
    for r in benchmark:
        assert len(r["categories"]) == 5
        for c in r["categories"]:
            pct = c["percentiles"]
            assert pct["p25"] < pct["p50"] < pct["p75"] < pct["p90"]

    BENCHMARK_PATH.write_text(json.dumps(benchmark, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(benchmark)} benchmark rows → {BENCHMARK_PATH}")
    print("OK")


if __name__ == "__main__":
    main()
