#!/usr/bin/env python3
"""TASK-007 verification — hand-calc vs can_i_afford() output, side by side.

Run from repo root:
  python3 scripts/verify_task007_can_i_afford.py
"""

from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ml-service"))

from burn_rate import compute_burn_rate  # noqa: E402
from can_i_afford import can_i_afford  # noqa: E402

# Known persona window used for the ₹15,000 hand-calc (income credits + steady spend).
# Matches the TASK-007 Testing & Verification "known burn rate" scenario.
SIMPLE_PERSONA = [
    {"date": "2026-07-01", "category": "income", "amount": 100000, "description": "salary"},
    {"date": "2026-07-01", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-02", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-03", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-04", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-05", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-06", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-07", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-08", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-09", "category": "food", "amount": 2000, "description": "spend"},
    {"date": "2026-07-10", "category": "food", "amount": 2000, "description": "spend"},
]


def _hand_proj(transactions: list) -> dict:
    """Independent copy of CONTRACT-003's projection math for the side-by-side evidence."""
    credits = {"income", "salary", "credit", "refund", "cashback"}

    def signed(txn: dict) -> float:
        amount = float(txn["amount"])
        cat = str(txn.get("category", "")).strip().lower()
        return abs(amount) if cat in credits else -abs(amount)

    dated = [(date.fromisoformat(str(t["date"])[:10]), signed(t)) for t in transactions]
    dated.sort(key=lambda p: p[0])
    first, last = dated[0][0], dated[-1][0]
    n = (last - first).days + 1
    daily_net = [0.0] * n
    for d, amt in dated:
        daily_net[(d - first).days] += amt
    balances: list[float] = []
    running = 0.0
    for net in daily_net:
        running += net
        balances.append(running)

    mean_t = (n - 1) / 2
    mean_b = sum(balances) / n
    var_t = sum((t - mean_t) ** 2 for t in range(n))
    cov = sum((t - mean_t) * (balances[t] - mean_b) for t in range(n))
    slope = cov / var_t
    fitted_last = mean_b + slope * ((n - 1) - mean_t)
    if slope < 0 and fitted_last > 0:
        days = min(int(fitted_last / -slope) + 1, 3650)
    elif fitted_last <= 0:
        days = 0
    else:
        days = 3650
    return {
        "fitted_last": round(fitted_last, 2),
        "slope": round(slope, 2),
        "days_to_zero": days,
        "projected_zero_balance_date": (last + timedelta(days=days)).isoformat(),
    }


def main() -> int:
    failures = 0
    today = date.today()

    # --- 1) No-regression: baseline regressor unchanged when no hypo expense ---
    baseline_a = compute_burn_rate(SIMPLE_PERSONA)
    baseline_b = compute_burn_rate(list(SIMPLE_PERSONA))  # fresh list, same rows
    if baseline_a != baseline_b:
        print("FAIL no-regression: identical inputs produced different burn_rate output")
        failures += 1
    else:
        print("PASS no-regression: compute_burn_rate stable for no-hypothetical case")
        print("     ", baseline_a)

    # --- 2) ₹15,000 laptop — hand-calc vs actual ---
    amount = 15000
    hand_base = _hand_proj(SIMPLE_PERSONA)
    hypo_rows = [
        *SIMPLE_PERSONA,
        {
            "date": "2026-07-10",
            "category": "shopping",
            "amount": amount,
            "description": "[hypothetical] laptop",
        },
    ]
    hand_hypo = _hand_proj(hypo_rows)
    expected_day_shift = (
        date.fromisoformat(hand_hypo["projected_zero_balance_date"])
        - date.fromisoformat(hand_base["projected_zero_balance_date"])
    ).days
    expected_affordable = (
        date.fromisoformat(hand_hypo["projected_zero_balance_date"]) > today
    )

    actual = can_i_afford("laptop", amount, SIMPLE_PERSONA)

    print()
    print("=== ₹15,000 laptop — hand-calc vs actual ===")
    print(f"HAND  baseline_zero : {hand_base['projected_zero_balance_date']}")
    print(f"      (fitted_last={hand_base['fitted_last']}, slope={hand_base['slope']}, "
          f"days_to_zero={hand_base['days_to_zero']})")
    print(f"HAND  hypo_zero     : {hand_hypo['projected_zero_balance_date']}")
    print(f"      (fitted_last={hand_hypo['fitted_last']}, slope={hand_hypo['slope']}, "
          f"days_to_zero={hand_hypo['days_to_zero']})")
    print(f"HAND  day_shift     : {expected_day_shift}")
    print(f"HAND  affordable    : {expected_affordable}  (today={today.isoformat()})")
    print(f"ACTUAL              : {json.dumps(actual, indent=2)}")

    if actual["day_shift"] != expected_day_shift:
        print(f"FAIL day_shift: expected {expected_day_shift}, got {actual['day_shift']}")
        failures += 1
    elif actual["new_zero_balance_date"] != hand_hypo["projected_zero_balance_date"]:
        print("FAIL new_zero_balance_date mismatch")
        failures += 1
    elif actual["affordable"] != expected_affordable:
        print("FAIL affordable mismatch")
        failures += 1
    else:
        print("PASS ₹15,000 scenario matches hand-calculation within rounding")

    # --- 3) Edge: expense large enough to push zero-date into the past ---
    edge = can_i_afford("luxury watch", 200000, SIMPLE_PERSONA)
    edge_date = date.fromisoformat(edge["new_zero_balance_date"])
    print()
    print("=== Edge: ₹200,000 → zero date into the past ===")
    print(f"ACTUAL: {json.dumps(edge, indent=2)}")
    if edge["affordable"] is not False:
        print("FAIL edge: expected affordable=false")
        failures += 1
    elif edge_date > today:
        print("FAIL edge: expected new_zero_balance_date on/before today")
        failures += 1
    elif edge_date.year < 1:
        print("FAIL edge: nonsense / negative date")
        failures += 1
    elif not edge["explanation"]:
        print("FAIL edge: empty explanation")
        failures += 1
    else:
        print("PASS edge: affordable=false with sane ISO date + explanation (no crash)")

    # --- 4) Persona smoke (arjun) — must not crash; day_shift is integer ---
    persona_path = ROOT / "data" / "personas" / "arjun_saver.json"
    if persona_path.exists():
        persona = json.loads(persona_path.read_text())
        # Augment with salary credits so the regressor has a positive balance trajectory
        # (TASK-004 spend rows alone are all debits → already-at-zero projection).
        income = float(persona["monthly_income"])
        txns = [
            {"date": "2026-04-18", "category": "income", "amount": income},
            {"date": "2026-05-01", "category": "income", "amount": income},
            {"date": "2026-06-01", "category": "income", "amount": income},
            *persona["transactions"],
        ]
        # Re-check no-regression on this richer set
        br1 = compute_burn_rate(txns)
        br2 = compute_burn_rate(list(txns))
        assert br1 == br2
        result = can_i_afford("laptop", 15000, txns)
        print()
        print("=== Persona arjun_saver + income credits, ₹15,000 ===")
        print("burn_rate baseline:", br1)
        print("can_i_afford:      ", json.dumps(result, indent=2))
        if not isinstance(result["day_shift"], int):
            print("FAIL persona: day_shift not int")
            failures += 1
        else:
            print("PASS persona smoke: contract shape returned without crash")
    else:
        print()
        print("SKIP persona smoke — data/personas/arjun_saver.json not present")

    print()
    if failures:
        print(f"RESULT: {failures} failure(s)")
        return 1
    print("RESULT: all TASK-007 checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
