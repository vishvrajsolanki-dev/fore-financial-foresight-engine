━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-003 — ML (Vishvraj)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : Python FastAPI microservice — classifier + burn-rate regressor
Your Scope      : CONTRACT-002 and CONTRACT-003, in full, as real HTTP endpoints. Lock the 5 centroid
                  vectors here — everything else in the build reasons over this math.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  Single-sample classification (distance-to-centroid, not clustering — one uploaded file is one
  sample). Runs in the same parallel block as Drashti's PAST page, which is why she's building
  against PLACEHOLDER-A right now instead of waiting on you — your job is to make that wait as short
  as possible and hand off cleanly at Checkpoint-1.

INTERFACE CONTRACT
  CONTRACT-002, CONTRACT-003, CONTRACT-006 (HTTP transport). You define CONTRACT-006 if it isn't
  already settled by TASK-005 — confirm with Allen before finalizing response shapes.

DEPENDENCIES
  Waiting on     : TASK-001 (stack + deploy confirmed working)
  You deliver to : TASK-002 (via placeholder swap), TASK-005/007/008 (burn-rate + tool-call math)

CONSTRAINTS
  FastAPI, deployed on Render (always-on instance, pre-provisioned) — not a Vercel Python function.
  No ML library needed for either function — Euclidean distance and linear regression are both
  simple enough hand-rolled.

ENVIRONMENT SETUP CHECK
  python -m venv .venv && pip install fastapi uvicorn numpy
  Confirm /classify responds locally via uvicorn, then confirm it also responds on the actual
  Render deployment (not just localhost) before handing off — TASK-001 already confirmed Render is
  reachable, this step confirms YOUR endpoint specifically is live there.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b feat/ML-003-classifier-burnrate
3. Never push directly to main
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit: feat(ML): TASK-003 <description>
6. git push -u origin feat/ML-003-classifier-burnrate
7. git pull origin main --rebase before PR
8. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. curl both endpoints directly, no UI needed
2. Scenario: run against 2 distinct synthetic personas
3. Expected: different archetype labels; burn-rate slope sign is correct (spending faster than
   income → negative trend toward zero-balance)
4. Edge case: near-zero variance across categories — confirm nearest-centroid still returns a label,
   no crash
5. No regression: N/A, first implementation
6. Evidence: pasted full JSON output for both personas, before PR

MANDATORY — PLACEHOLDER REPLACEMENT NOTE (include in your Mode 4 Session Log)
  Placeholder ID       : PLACEHOLDER-A
  Real vs Placeholder  : [exact diff vs the stub object in CONTRACTS.md]
  Consumer(s) to notify: TASK-002 (Drashti)
  Exact swap location  : frontend lib/api/pastClient.ts — replace hardcoded object with fetch calls
                         to /api/ml/classify and /api/ml/burn-rate
  Placeholder fallback : delete on swap, no reason to keep it
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  Both endpoints live and correct, centroid vectors locked in CONTRACTS.md, replacement note issued.

BRANCH / FILE OWNERSHIP
  Branch : feat/ML-003-classifier-burnrate
  Files  : ml-service/classify.py, ml-service/burn_rate.py, ml-service/centroids.py (deployed to Render)

ESCALATION PATH
  Blocked >20 min → Allen (HTTP contract question) or Lead → fallback: ship with provisional
  centroids flagged 🟡, refine in Tier 2

KNOWN RISKS
  Centroid values are subjective without real user data — pick defensible ratios (food/shopping/
  bills/entertainment/savings) and state the reasoning in the commit message.

CONFLICT WATCH
  TASK-002 (consumes your output shape), TASK-005/007/008 (call your endpoints)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
