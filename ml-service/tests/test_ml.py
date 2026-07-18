# FORE — ml-service/tests/test_ml.py
# Contract-conformance coverage for the ML math (CONTRACT-002/003/004) and its edge cases.
# Assertions are written against the LOCKED CONTRACTS, not one implementation's exact numbers,
# so they stay valid as the internal math is tuned. Run:
#   cd ml-service && ./.venv/bin/python -m pytest -q

import json
import os
from datetime import date

import pytest

from burn_rate import compute_burn_rate
from can_i_afford import can_i_afford
from centroids import CENTROIDS
from classify import classify

try:
    from centroids import FEATURE_KEYS  # main's key name
except ImportError:  # pragma: no cover - alt key name
    from centroids import FEATURE_ORDER as FEATURE_KEYS

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PERSONA_DIR = os.path.join(REPO_ROOT, "data", "personas")

ARCHETYPES = {
    "Disciplined Saver",
    "Impulsive Spender",
    "The Foodie",
    "Social Butterfly",
    "Balanced Spender",
}

# The personas the frontend actually loads (lib/data/personas.ts).
ACTIVE_PERSONAS = ["persona-priya", "persona-rahul", "persona-aisha"]


def load(name: str) -> dict:
    with open(os.path.join(PERSONA_DIR, f"{name}.json")) as f:
        return json.load(f)


def expected_archetype(d: dict) -> str:
    return d.get("archetype_intended") or d.get("expected_archetype")


# ---------------------------------------------------------------- centroids / contract shape
def test_centroids_locked_and_normalized():
    assert set(CENTROIDS.keys()) == ARCHETYPES
    for label, vec in CENTROIDS.items():
        assert set(vec.keys()) == set(FEATURE_KEYS), label
        assert abs(sum(vec.values()) - 1.0) < 1e-6, f"{label} centroid must sum to 1.0"


# ---------------------------------------------------------------- classify (CONTRACT-002)
@pytest.mark.parametrize("name", ACTIVE_PERSONAS)
def test_classify_matches_intended_archetype(name):
    d = load(name)
    out = classify(d["transactions"], d["monthly_income"])
    assert out["label"] == expected_archetype(d), f"{name}: {out['distances']}"


@pytest.mark.parametrize("name", ACTIVE_PERSONAS)
def test_classify_returns_all_five_distances(name):
    d = load(name)
    out = classify(d["transactions"], d["monthly_income"])
    assert set(out["distances"].keys()) == ARCHETYPES
    assert out["label"] == min(out["distances"], key=out["distances"].get)


def test_classify_uniform_spend_no_crash():
    txns = [
        {"date": "2026-04-0%d" % day, "category": cat, "amount": -1000}
        for day in range(1, 6)
        for cat in ("food", "shopping", "bills", "entertainment")
    ]
    assert classify(txns, 50000)["label"] in ARCHETYPES


def test_classify_no_spend_no_crash():
    txns = [{"date": "2026-04-01", "category": "income", "amount": 50000}]
    assert classify(txns, 50000)["label"] in ARCHETYPES


# ---------------------------------------------------------------- burn-rate (CONTRACT-003)
def test_burn_rate_contract_fields_and_types():
    out = compute_burn_rate(load("persona-aisha")["transactions"])
    assert set(out.keys()) == {"daily_avg", "trend_slope", "projected_zero_balance_date"}
    assert isinstance(out["daily_avg"], (int, float))
    assert isinstance(out["trend_slope"], (int, float))
    date.fromisoformat(out["projected_zero_balance_date"])  # parseable ISO date


def test_burn_rate_saver_trend_higher_than_impulsive():
    saver = compute_burn_rate(load("persona-priya")["transactions"])["trend_slope"]
    impulsive = compute_burn_rate(load("persona-aisha")["transactions"])["trend_slope"]
    # A disciplined saver's balance trend must be healthier than an impulsive spender's.
    assert saver > impulsive


def test_burn_rate_empty_raises():
    with pytest.raises(ValueError):
        compute_burn_rate([])


# ---------------------------------------------------------------- can-i-afford (CONTRACT-004)
@pytest.mark.parametrize("name", ACTIVE_PERSONAS)
def test_afford_output_shape_and_types(name):
    out = can_i_afford("laptop", 15000, load(name)["transactions"])
    assert set(out.keys()) == {"affordable", "day_shift", "new_zero_balance_date", "explanation"}
    assert isinstance(out["affordable"], bool)
    assert isinstance(out["day_shift"], int)
    assert isinstance(out["explanation"], str) and out["explanation"]
    date.fromisoformat(out["new_zero_balance_date"])


@pytest.mark.parametrize("name", ACTIVE_PERSONAS)
def test_afford_purchase_never_extends_runway(name):
    # CONTRACT-004 invariant: inserting an expense can only pull the zero-balance date earlier
    # (or leave it unchanged) — never later.
    out = can_i_afford("laptop", 15000, load(name)["transactions"])
    assert out["day_shift"] <= 0


def test_afford_huge_expense_not_affordable_no_crash():
    out = can_i_afford("mansion", 100_000_000, load("persona-aisha")["transactions"])
    assert out["affordable"] is False
    date.fromisoformat(out["new_zero_balance_date"])  # real date, never a negative/garbage value


# ---------------------------------------------------------------- data integrity (TASK-004)
@pytest.mark.parametrize("name", ACTIVE_PERSONAS)
def test_active_personas_have_enough_transactions(name):
    d = load(name)
    assert 100 <= len(d["transactions"]) <= 160
    assert expected_archetype(d) in ARCHETYPES
