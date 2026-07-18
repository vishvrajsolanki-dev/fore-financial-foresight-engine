#!/usr/bin/env python3
"""Full TASK-004 verification — exits non-zero on any failure."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEND_CATEGORIES = {"food", "shopping", "bills", "entertainment", "savings"}
ARCHETYPES = {
    "Disciplined Saver",
    "Impulsive Spender",
    "The Foodie",
    "Social Butterfly",
    "Balanced Spender",
}

# Current demo personas (scripts/generate_data.py output).
PERSONA_FILES = ["persona-priya", "persona-rahul", "persona-aisha"]

# CONTRACT-005 coverage grid (generate_data.py).
INCOME_BRACKETS = ["0-25k", "25k-50k", "50k-75k", "75k-100k", "100k+"]
CITY_TIERS = ["Tier 1", "Tier 2", "Tier 3"]


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"OK  : {msg}")


def spend_share(transactions: list[dict]) -> dict[str, float]:
    totals = {c: 0.0 for c in SPEND_CATEGORIES}
    for t in transactions:
        if t["category"] not in SPEND_CATEGORIES:
            continue
        totals[t["category"]] += abs(float(t["amount"]))
    spent = sum(totals.values()) or 1.0
    return {c: totals[c] / spent for c in SPEND_CATEGORIES}


def verify_personas() -> None:
    personas_dir = ROOT / "data" / "personas"
    loaded = {}
    for name in PERSONA_FILES:
        path = personas_dir / f"{name}.json"
        if not path.exists():
            fail(f"missing persona file {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        for key in (
            "session_id",
            "persona",
            "monthly_income",
            "income_bracket",
            "city_tier",
            "transactions",
        ):
            if key not in data:
                fail(f"{name}: missing field {key}")
        if data["session_id"] != name:
            fail(f"{name}: session_id mismatch ({data['session_id']})")
        archetype = data.get("archetype_intended") or data.get("expected_archetype")
        if archetype not in ARCHETYPES:
            fail(f"{name}: bad archetype {archetype}")
        if data["income_bracket"] not in INCOME_BRACKETS:
            fail(f"{name}: bad income_bracket {data['income_bracket']}")
        if data["city_tier"] not in CITY_TIERS:
            fail(f"{name}: bad city_tier {data['city_tier']}")
        if not isinstance(data["monthly_income"], (int, float)) or data["monthly_income"] <= 0:
            fail(f"{name}: invalid monthly_income")
        txs = data["transactions"]
        n = len(txs)
        if n < 50:
            fail(f"{name}: expected a substantial transaction ledger, got {n}")
        dates = []
        for i, t in enumerate(txs):
            for key in ("date", "category", "amount"):
                if key not in t:
                    fail(f"{name}: tx[{i}] missing {key}")
            if not isinstance(t["amount"], (int, float)) or t["amount"] == 0:
                fail(f"{name}: tx[{i}] zero or non-numeric amount")
            if len(t["date"]) != 10 or t["date"][4] != "-" or t["date"][7] != "-":
                fail(f"{name}: tx[{i}] bad date {t['date']}")
            dates.append(t["date"])
        if dates != sorted(dates):
            fail(f"{name}: transactions not sorted by date")
        loaded[name] = data
        shares = spend_share(txs)
        ok(
            f"{name}: n={n} spend_shares="
            f"{{{', '.join(f'{k}:{v:.3f}' for k, v in shares.items())}}}"
        )

    shares = {k: spend_share(v["transactions"]) for k, v in loaded.items()}
    if max(shares["persona-rahul"], key=shares["persona-rahul"].get) != "food":
        fail("persona-rahul signature category is not food")
    if max(shares["persona-priya"], key=shares["persona-priya"].get) != "savings":
        fail("persona-priya signature category is not savings")
    if max(shares["persona-aisha"], key=shares["persona-aisha"].get) != "shopping":
        fail("persona-aisha signature category is not shopping")
    ok("persona distinctness (share signatures) passed")


def verify_benchmark() -> None:
    path = ROOT / "data" / "benchmark.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "brackets" in raw:
        data = raw["brackets"]
    elif isinstance(raw, list):
        data = raw
    else:
        fail("benchmark.json must be an array or { brackets: [...] } per CONTRACT-005")

    if len(data) != 15:
        fail(f"benchmark.json expected 15 rows, got {len(data)}")
    seen = set()
    for i, row in enumerate(data):
        for key in ("income_bracket", "city_tier", "categories"):
            if key not in row:
                fail(f"benchmark[{i}] missing {key}")
        if row["income_bracket"] not in INCOME_BRACKETS:
            fail(f"benchmark[{i}] bad bracket {row['income_bracket']}")
        if row["city_tier"] not in CITY_TIERS:
            fail(f"benchmark[{i}] bad tier {row['city_tier']}")
        pair = (row["income_bracket"], row["city_tier"])
        if pair in seen:
            fail(f"duplicate benchmark pair {pair}")
        seen.add(pair)
        cats = row["categories"]
        if len(cats) != 5:
            fail(f"benchmark[{i}] expected 5 categories, got {len(cats)}")
        names = [c["category"] for c in cats]
        if set(names) != SPEND_CATEGORIES:
            fail(f"benchmark[{i}] category set mismatch: {names}")
        for c in cats:
            pct = c["percentiles"]
            for k in ("p25", "p50", "p75", "p90"):
                if k not in pct:
                    fail(f"benchmark[{i}] {c['category']} missing {k}")
            if not (pct["p25"] < pct["p50"] < pct["p75"] < pct["p90"]):
                fail(f"benchmark[{i}] {c['category']} percentiles not strictly increasing")
    for b in INCOME_BRACKETS:
        for t in CITY_TIERS:
            if (b, t) not in seen:
                fail(f"missing benchmark cell {b} × {t}")
    ok("benchmark coverage: 5 brackets × 3 tiers, no gaps")


def verify_contract_types_file() -> None:
    path = ROOT / "types" / "financialContext.ts"
    text = path.read_text(encoding="utf-8")
    required = [
        "export interface FinancialContext",
        "export interface Transaction",
        "export interface BenchmarkRow",
        "export interface PersonaDataset",
        "session_id: string",
        "persona: string",
        "monthly_income: number",
        "archetype:",
        "burn_rate:",
        "transactions: Transaction[]",
        "goal:",
        "last_decide_verdict:",
        "benchmark:",
        '"Disciplined Saver"',
        '"Impulsive Spender"',
        '"The Foodie"',
        '"Social Butterfly"',
        '"Balanced Spender"',
    ]
    for needle in required:
        if needle not in text:
            fail(f"financialContext.ts missing CONTRACT-001 marker: {needle}")
    ok("types/financialContext.ts contains CONTRACT-001 shape")


def main() -> None:
    verify_contract_types_file()
    verify_personas()
    verify_benchmark()
    print("\nALL TASK-004 DATA/CONTRACT CHECKS PASSED")


if __name__ == "__main__":
    main()
