#!/usr/bin/env python3
"""FORE demo spine smoke test — FORE_Blueprint.md §8 sequence."""

import json
import sys
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

BASE = "http://127.0.0.1:3000"
ML = "http://127.0.0.1:8000"


def make_opener() -> urllib.request.OpenerDirector:
    jar = CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def post(url: str, payload: dict, opener: urllib.request.OpenerDirector | None = None) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    open_fn = opener.open if opener else urllib.request.urlopen
    with open_fn(req, timeout=30) as resp:
        return json.loads(resp.read())


def get(url: str, opener: urllib.request.OpenerDirector) -> dict:
    req = urllib.request.Request(url, method="GET")
    with opener.open(req, timeout=15) as resp:
        return json.loads(resp.read())



def main() -> int:
    with open("data/personas/persona-rahul.json") as f:
        persona = json.load(f)

    txns = persona["transactions"]
    income = persona["monthly_income"]

    opener = make_opener()
    # Optional auth when DB mode is on — ML/DECIDE API routes stay public for demo spine.
    me = get(f"{BASE}/api/auth/me", opener)
    if me.get("database") and not me.get("authenticated"):
        email = f"smoke-{__import__('time').time_ns()}@fore.test"
        try:
            post(
                f"{BASE}/api/auth/register",
                {"email": email, "password": "SmokeTest123!", "monthlyIncome": 60000},
                opener,
            )
        except urllib.error.HTTPError:
            pass  # spine test does not require auth for public ML/DECIDE routes

    print("1. PAST — classify + burn-rate")
    archetype = post(
        f"{BASE}/api/ml/classify", {"transactions": txns, "monthly_income": income}, opener
    )
    burn = post(f"{BASE}/api/ml/burn-rate", {"transactions": txns}, opener)
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
        opener,
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
