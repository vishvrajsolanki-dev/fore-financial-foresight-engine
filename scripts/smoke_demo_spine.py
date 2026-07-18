#!/usr/bin/env python3
"""FORE demo spine smoke test — FORE_Blueprint.md §8 sequence."""

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3000"
ML = "http://127.0.0.1:8000"


def post(url: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def main() -> int:
    with open("data/personas/persona-rahul.json") as f:
        persona = json.load(f)

    txns = persona["transactions"]
    income = persona["monthly_income"]

    print("1. PAST — classify + burn-rate")
    archetype = post(f"{BASE}/api/ml/classify", {"transactions": txns, "monthly_income": income})
    burn = post(f"{BASE}/api/ml/burn-rate", {"transactions": txns})
    assert archetype.get("label"), "missing archetype label"
    assert burn.get("projected_zero_balance_date"), "missing zero-balance date"
    print(f"   archetype={archetype['label']}, zero_balance={burn['projected_zero_balance_date']}")

    print("2. AHEAD — goal context prepared")
    goal = {
        "target_amount": 50000,
        "target_date": "2026-12-31",
        "on_pace": True,
        "pace_gap_days": 0,
    }

    print('3. DECIDE — "Can I afford a ₹15,000 laptop next month?"')
    decide = post(
        f"{BASE}/api/decide",
        {
            "message": "Can I afford a ₹15,000 laptop next month?",
            "transactions": txns,
            "financial_context": {
                "persona": persona["persona"],
                "monthly_income": income,
                "archetype": {"label": archetype["label"], "distances": archetype["distances"]},
                "burn_rate": burn,
                "goal": goal,
                "benchmark": None,
                "last_decide_verdict": None,
            },
        },
    )
    assert decide.get("tool_called") is True, "canIAfford tool was not called"
    verdict = decide.get("verdict")
    assert verdict and "day_shift" in verdict, "missing verdict day_shift"
    print(f"   tool_called=True, day_shift={verdict['day_shift']}, reply={decide.get('reply','')[:80]}...")

    print("4. ML service direct can-i-afford check")
    ml = post(
        f"{ML}/can-i-afford",
        {"item": "laptop", "amount": 15000, "transactions": txns},
    )
    assert ml["day_shift"] == verdict["day_shift"], "Vercel→Render day_shift mismatch"
    print(f"   Render day_shift matches: {ml['day_shift']}")

    print("5. CORS env wiring")
    import os

    sys.path.insert(0, "ml-service")
    import main as ml_main  # noqa: E402

    assert "http://localhost:3000" in ml_main.ALLOWED_ORIGINS
    print(f"   ALLOWED_ORIGINS default includes localhost ({len(ml_main.ALLOWED_ORIGINS)} origin(s))")

    print("\nALL DEMO SPINE SMOKE CHECKS PASSED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as e:
        print(f"FAIL: {e}", file=sys.stderr)
        raise SystemExit(1)
