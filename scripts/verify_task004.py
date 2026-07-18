#!/usr/bin/env python3
"""Full TASK-004 verification — exits non-zero on any failure."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {"food", "shopping", "bills", "entertainment", "savings"}
BRACKETS = {
    "Under ₹30k",
    "₹30k–₹60k",
    "₹60k–₹1L",
    "₹1L–₹2L",
    "₹2L+",
}
TIERS = {"Tier-1", "Tier-2", "Tier-3"}
ARCHETYPES = {
    "Disciplined Saver",
    "Impulsive Spender",
    "The Foodie",
    "Social Butterfly",
    "Balanced Spender",
}
PERSONAS = ["maya_foodie", "arjun_saver", "riya_social"]


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"OK  : {msg}")


def category_share(transactions: list[dict]) -> dict[str, float]:
    totals = {c: 0.0 for c in CATEGORIES}
    for t in transactions:
        totals[t["category"]] += float(t["amount"])
    spent = sum(totals.values()) or 1.0
    return {c: totals[c] / spent for c in CATEGORIES}


def verify_personas() -> None:
    personas_dir = ROOT / "data" / "personas"
    loaded = {}
    for name in PERSONAS:
        path = personas_dir / f"{name}.json"
        if not path.exists():
            fail(f"missing persona file {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        for key in (
            "persona",
            "display_name",
            "expected_archetype",
            "monthly_income",
            "income_bracket",
            "city_tier",
            "transactions",
        ):
            if key not in data:
                fail(f"{name}: missing field {key}")
        if data["persona"] != name:
            fail(f"{name}: persona id mismatch ({data['persona']})")
        if data["expected_archetype"] not in ARCHETYPES:
            fail(f"{name}: bad archetype {data['expected_archetype']}")
        if data["income_bracket"] not in BRACKETS:
            fail(f"{name}: bad income_bracket {data['income_bracket']}")
        if data["city_tier"] not in TIERS:
            fail(f"{name}: bad city_tier {data['city_tier']}")
        if not isinstance(data["monthly_income"], (int, float)) or data["monthly_income"] <= 0:
            fail(f"{name}: invalid monthly_income")
        txs = data["transactions"]
        n = len(txs)
        if not (100 <= n <= 150):
            fail(f"{name}: expected 100-150 transactions, got {n}")
        dates = []
        for i, t in enumerate(txs):
            for key in ("date", "category", "amount"):
                if key not in t:
                    fail(f"{name}: tx[{i}] missing {key}")
            if t["category"] not in CATEGORIES:
                fail(f"{name}: tx[{i}] bad category {t['category']}")
            if not isinstance(t["amount"], (int, float)) or t["amount"] <= 0:
                fail(f"{name}: tx[{i}] non-positive amount")
            # ISO date sanity
            if len(t["date"]) != 10 or t["date"][4] != "-" or t["date"][7] != "-":
                fail(f"{name}: tx[{i}] bad date {t['date']}")
            dates.append(t["date"])
        if dates != sorted(dates):
            fail(f"{name}: transactions not sorted by date")
        if min(dates) < "2026-04-01" or max(dates) > "2026-07-31":
            fail(f"{name}: dates outside expected 3-month demo window")
        loaded[name] = data
        shares = category_share(txs)
        ok(f"{name}: n={n} shares={{{', '.join(f'{k}:{v:.3f}' for k,v in shares.items())}}}")

    shares = {k: category_share(v["transactions"]) for k, v in loaded.items()}
    if max(shares["maya_foodie"], key=shares["maya_foodie"].get) != "food":
        fail("maya_foodie signature category is not food")
    if max(shares["arjun_saver"], key=shares["arjun_saver"].get) != "savings":
        fail("arjun_saver signature category is not savings")
    if max(shares["riya_social"], key=shares["riya_social"].get) != "entertainment":
        fail("riya_social signature category is not entertainment")
    if shares["maya_foodie"]["food"] <= shares["arjun_saver"]["food"]:
        fail("foodie food share not greater than saver")
    if shares["arjun_saver"]["savings"] <= shares["maya_foodie"]["savings"]:
        fail("saver savings share not greater than foodie")
    if shares["riya_social"]["entertainment"] <= shares["maya_foodie"]["entertainment"]:
        fail("social entertainment share not greater than foodie")

    def count(name: str, cat: str) -> int:
        return sum(1 for t in loaded[name]["transactions"] if t["category"] == cat)

    if count("maya_foodie", "food") <= count("arjun_saver", "food") + 20:
        fail("food frequency not distinct enough (foodie vs saver)")
    if count("riya_social", "entertainment") <= count("maya_foodie", "entertainment") + 15:
        fail("entertainment frequency not distinct enough (social vs foodie)")
    ok("persona distinctness (share + frequency) passed")


def verify_benchmark() -> None:
    path = ROOT / "data" / "benchmark.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        fail("benchmark.json must be an array of CONTRACT-005 rows")
    if len(data) != 15:
        fail(f"benchmark.json expected 15 rows, got {len(data)}")
    seen = set()
    for i, row in enumerate(data):
        for key in ("income_bracket", "city_tier", "categories"):
            if key not in row:
                fail(f"benchmark[{i}] missing {key}")
        if row["income_bracket"] not in BRACKETS:
            fail(f"benchmark[{i}] bad bracket {row['income_bracket']}")
        if row["city_tier"] not in TIERS:
            fail(f"benchmark[{i}] bad tier {row['city_tier']}")
        pair = (row["income_bracket"], row["city_tier"])
        if pair in seen:
            fail(f"duplicate benchmark pair {pair}")
        seen.add(pair)
        cats = row["categories"]
        if len(cats) != 5:
            fail(f"benchmark[{i}] expected 5 categories, got {len(cats)}")
        names = [c["category"] for c in cats]
        if set(names) != CATEGORIES:
            fail(f"benchmark[{i}] category set mismatch: {names}")
        for c in cats:
            pct = c["percentiles"]
            for k in ("p25", "p50", "p75", "p90"):
                if k not in pct:
                    fail(f"benchmark[{i}] {c['category']} missing {k}")
            if not (pct["p25"] < pct["p50"] < pct["p75"] < pct["p90"]):
                fail(f"benchmark[{i}] {c['category']} percentiles not strictly increasing")
    for b in BRACKETS:
        for t in TIERS:
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
