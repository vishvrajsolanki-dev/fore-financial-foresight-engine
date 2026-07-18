# FORE — ml-service/main.py
# Owner: TASK-001 (health + CORS setup); endpoints owned by TASK-003 (/classify, /burn-rate)
# and TASK-007 (/can-i-afford).
# Deployed on Render as an always-on instance (CONTRACT-006) — never assume co-location with
# the Vercel Next.js app; every call from Next.js is a genuine cross-origin HTTP request.

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from burn_rate import compute_burn_rate
from can_i_afford import can_i_afford
from classify import classify

app = FastAPI(title="FORE ML Service")

# CONTRACT-006: allow the Vercel domain(s) explicitly, never "*". Configurable via env so the real
# Vercel URL is set at deploy time on Render without a code change.
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_extra = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class Transaction(BaseModel):
    date: str
    category: str
    amount: float
    description: str | None = None


class ClassifyRequest(BaseModel):
    transactions: list[Transaction]
    monthly_income: float


class BurnRateRequest(BaseModel):
    transactions: list[Transaction]


class CanIAffordRequest(BaseModel):
    item: str
    amount: float
    transactions: list[Transaction]


def _strip_internal(d: dict) -> dict:
    """Remove helper fields (prefixed with '_') that are not part of the public contract shape."""
    return {k: v for k, v in d.items() if not k.startswith("_")}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/classify")
def classify_endpoint(req: ClassifyRequest):
    txns = [t.model_dump() for t in req.transactions]
    try:
        return classify(txns, req.monthly_income)
    except Exception as exc:  # noqa: BLE001 — surface a clean contract error shape
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/burn-rate")
def burn_rate_endpoint(req: BurnRateRequest):
    txns = [t.model_dump() for t in req.transactions]
    try:
        return _strip_internal(compute_burn_rate(txns))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/can-i-afford")
def can_i_afford_endpoint(req: CanIAffordRequest):
    txns = [t.model_dump() for t in req.transactions]
    try:
        return can_i_afford(req.item, req.amount, txns)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))
