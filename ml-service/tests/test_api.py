# FORE — ml-service/tests/test_api.py
# HTTP-boundary coverage for the FastAPI endpoints (CONTRACT-002/003/004/006): correct response
# shapes and clean, contract-shaped error handling.

import json
import os

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load(name: str) -> dict:
    with open(os.path.join(REPO_ROOT, "data", "personas", f"{name}.json")) as f:
        return json.load(f)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_classify_endpoint():
    d = load("persona-aisha")
    r = client.post(
        "/classify",
        json={"transactions": d["transactions"], "monthly_income": d["monthly_income"]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["label"] == "Impulsive Spender"
    assert len(body["distances"]) == 5


def test_burn_rate_endpoint_shape():
    d = load("persona-priya")
    r = client.post("/burn-rate", json={"transactions": d["transactions"]})
    assert r.status_code == 200
    assert set(r.json().keys()) == {"daily_avg", "trend_slope", "projected_zero_balance_date"}


def test_can_i_afford_endpoint_shape():
    d = load("persona-rahul")
    r = client.post(
        "/can-i-afford",
        json={"item": "phone", "amount": 5000, "transactions": d["transactions"]},
    )
    assert r.status_code == 200
    assert set(r.json().keys()) == {
        "affordable",
        "day_shift",
        "new_zero_balance_date",
        "explanation",
    }


def test_validation_error_is_contract_shaped():
    # Missing monthly_income / empty transactions -> a 4xx with a JSON body the Next.js routes
    # can rely on (CONTRACT-006: never crash the chat UI on an upstream error).
    r = client.post("/classify", json={"transactions": []})
    assert r.status_code >= 400
    body = r.json()
    assert "error" in body or "detail" in body


def test_cors_allows_localhost_not_wildcard():
    r = client.options(
        "/classify",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    allow_origin = r.headers.get("access-control-allow-origin")
    assert allow_origin == "http://localhost:3000"
    assert allow_origin != "*"
