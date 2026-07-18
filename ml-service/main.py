# FORE — ml-service/main.py
# Owner: TASK-001 (health + CORS setup), individual endpoints owned by TASK-003/TASK-007.
# Deployed on Render as an always-on instance (CONTRACT-006) — never assume co-location with
# the Vercel Next.js app; every call from Next.js is a genuine cross-origin HTTP request.

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from burn_rate import compute_burn_rate
from classify import classify

app = FastAPI(title="FORE ML Service")

# TODO(TASK-001): replace with the actual Vercel domain(s), never "*", per CONTRACT-006.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    # "https://<your-vercel-domain>.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# CONTRACT-006: error shape on any 4xx/5xx is { error: string } — not FastAPI's default
# { detail: ... } — so the Next.js routes can rely on one shape and never crash the chat UI.
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": str(exc.errors())})


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"error": str(exc)})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": str(exc)})


@app.get("/health")
def health():
    # TASK-001's own smoke test: hit this twice in a row from the Next.js server side,
    # confirm the second call isn't meaningfully slower (rules out spin-down / cold start).
    return {"status": "ok"}


class Transaction(BaseModel):
    date: str
    category: str
    amount: float
    description: str | None = None


class ClassifyRequest(BaseModel):
    transactions: list[Transaction] = Field(min_length=1)
    monthly_income: float = Field(gt=0)


class BurnRateRequest(BaseModel):
    transactions: list[Transaction] = Field(min_length=1)


# CONTRACT-002 — archetype classifier (TASK-003).
@app.post("/classify")
def classify_endpoint(body: ClassifyRequest):
    return classify(
        [txn.model_dump() for txn in body.transactions],
        body.monthly_income,
    )


# CONTRACT-003 — burn-rate regressor (TASK-003).
@app.post("/burn-rate")
def burn_rate_endpoint(body: BurnRateRequest):
    return compute_burn_rate([txn.model_dump() for txn in body.transactions])


# TODO(TASK-007): mount /can-i-afford (CONTRACT-004) endpoint, implemented in can_i_afford.py,
#   reusing burn_rate.py's regressor with the hypothetical expense inserted — no second
#   regression path.
