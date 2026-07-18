━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-004 — ML (Vishvraj, paired with Kavya)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : Synthetic data + benchmark JSON + financial_context contract file + shell deploy
Your Scope      : Generate 2-3 demo transaction sets, generate the static benchmark JSON
                  (CONTRACT-005), write the financial_context TypeScript interface file
                  (CONTRACT-001), confirm the empty shell is live on Vercel.
Pairing note    : Vishvraj owns this file and its Session Log. Kavya may execute this task in
                  parallel with Vishvraj's TASK-003 this block — same accountability, Vishvraj signs
                  off either way. This is why TASK-004 moved here: data calibrated to feed the
                  classifier is naturally close to TASK-003's own work, and pairing keeps both tasks
                  inside the same 30-min G1 window instead of stacking onto one person's clock.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  Everyone's task depends on this data existing and this contract file being real, importable code —
  not just a description in CONTRACTS.md. Runs in the same parallel block as your own TASK-003.

INTERFACE CONTRACT
  You are the one who WRITES CONTRACT-001 and CONTRACT-005 into actual code.

DEPENDENCIES
  Waiting on     : TASK-001
  You deliver to : TASK-002/003/005/006/007/008, CHECKPOINT-1

CONSTRAINTS
  Static JSON files, generated once, checked into the repo — zero runtime generation during demo.

ENVIRONMENT SETUP CHECK
  Confirm TASK-001's Vercel link works before generating data — deploy the shell first, populate
  data second, so a deploy failure is caught early, not discovered at Checkpoint-1.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b feat/ML-004-synthetic-data-deploy
3. Never push directly to main
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit: feat(ML): TASK-004 <description>
6. git push -u origin feat/ML-004-synthetic-data-deploy
7. git pull origin main --rebase before PR
8. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Import financial_context.ts in a scratch file, confirm it type-checks against CONTRACT-001
2. Scenario: generate 2-3 personas, inspect for realistic category spread (not uniform random)
3. Expected: ~100-150 transactions per persona across 3 months, visibly different frequency
   patterns between personas — that's what makes classification meaningful, and it's the same
   dataset your own TASK-003 classifier will be tested against, so get the distinctness right
4. Edge case: benchmark JSON covers all 5 income brackets × 3 city tiers — no gaps
5. No regression: N/A, first implementation
6. Evidence: pasted sample transaction array + the live deployed Vercel URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  data/personas/*.json, data/benchmark.json, types/financialContext.ts, live empty-shell URL.

BRANCH / FILE OWNERSHIP
  Branch : feat/ML-004-synthetic-data-deploy
  Files  : data/*, types/financialContext.ts, vercel.json

ESCALATION PATH
  Blocked >20 min → Lead → fallback: ship with 1 persona instead of 2-3, note as Tier 2 pull item

KNOWN RISKS
  If personas are too similar, TASK-003's classifier will look broken even if it's correct — sanity
  check persona distinctness before handing off. Since you own both tasks this block, this is a
  self-check, not a handoff risk — don't skip it just because there's no second person to catch it.

CONFLICT WATCH
  Everyone — this is the shared foundation, flag any contract-shape change immediately.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
