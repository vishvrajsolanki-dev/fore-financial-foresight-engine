# FORE — ml-service/main.py
# Owner: TASK-001 (health + CORS setup), individual endpoints owned by TASK-003/TASK-007.
# Deployed on Render as an always-on instance (CONTRACT-006) — never assume co-location with
# the Vercel Next.js app; every call from Next.js is a genuine cross-origin HTTP request.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/health")
def health():
    # TASK-001's own smoke test: hit this twice in a row from the Next.js server side,
    # confirm the second call isn't meaningfully slower (rules out spin-down / cold start).
    return {"status": "ok"}


# TODO(TASK-003): mount /classify (CONTRACT-002) and /burn-rate (CONTRACT-003) endpoints,
#   implemented in classify.py / burn_rate.py, using centroids.py's locked centroid vectors.
# TODO(TASK-007): mount /can-i-afford (CONTRACT-004) endpoint, implemented in can_i_afford.py,
#   reusing burn_rate.py's regressor with the hypothetical expense inserted — no second
#   regression path.
