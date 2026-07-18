━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-006 — FRONTEND (Drashti)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : AHEAD UI — goal calculator + benchmark panel
Your Scope      : Goal input form (target amount + date), pace calculation display, benchmark
                  percentile panel. Reads financial_context, no placeholder needed here — TASK-004's
                  real benchmark data already exists by the time you start (post-Checkpoint-1).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  Third face of the spine. Must visibly update when a DECIDE verdict changes the trajectory — that
  link is what makes this "one system," not three disconnected screens.

INTERFACE CONTRACT
  CONTRACT-001 (goal + benchmark fields), CONTRACT-005 (benchmark JSON shape, real by now).

DEPENDENCIES
  Waiting on     : TASK-004 (real, done by Checkpoint-1), CHECKPOINT-1
  You deliver to : CHECKPOINT-2

CONSTRAINTS
  Same stack as TASK-002. Pace calc: compare goal.target_amount / days-remaining against
  burn_rate.daily_avg — simple arithmetic, not a new model, not a new endpoint.

ENVIRONMENT SETUP CHECK
  Confirm data/benchmark.json is importable and shaped per CONTRACT-005 before building the panel.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b feat/FE-006-ahead-goal-benchmark
3. Never push directly to main
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit: feat(FE): TASK-006 <description>
6. git push -u origin feat/FE-006-ahead-goal-benchmark
7. git pull origin main --rebase before PR
8. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. npm run dev, set a goal, observe the pace verdict
2. Scenario: set a target clearly achievable at current burn rate, then one clearly unachievable
3. Expected: on_pace flips correctly between the two, pace_gap_days is a sane number
4. Edge case: target_date in the past — validation message, not a nonsensical negative
5. No regression: shell nav (TASK-002) still functions
6. Evidence: screenshots of both goal states, before PR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  AHEAD tab functional: goal set → pace verdict, benchmark percentile rendered for the active persona.

BRANCH / FILE OWNERSHIP
  Branch : feat/FE-006-ahead-goal-benchmark
  Files  : app/(faces)/ahead/*, components/GoalPanel.tsx, components/BenchmarkPanel.tsx

ESCALATION PATH
  Blocked >20 min → Allen (data shape question) or Lead

KNOWN RISKS
  Must re-read financial_context after every DECIDE verdict, not just on initial load — stale pace
  display is the exact "three disconnected screens" failure this product is designed to avoid.

CONFLICT WATCH
  TASK-008 (DECIDE verdicts this panel must reflect), TASK-004 (benchmark data shape)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
