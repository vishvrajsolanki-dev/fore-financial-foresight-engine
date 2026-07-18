━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-002 — FRONTEND (Drashti)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : Next.js shell + PAST page
Your Scope      : App shell (3-tab nav), PAST page UI. Built against PLACEHOLDER-A for this block —
                  Vishvraj's real classifier lands at the same time as you, not before.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  First page a judge sees. You will swap this from PLACEHOLDER-A to real data as part of Checkpoint-1
  — build the UI so that swap is a one-file change, not scattered edits.

INTERFACE CONTRACT
  PLACEHOLDER-A (exact JSON in CONTRACTS.md) for this task. CONTRACT-001 (financial_context) for the
  shape you write into once real data lands.

DEPENDENCIES
  Waiting on     : TASK-001
  You deliver to : TASK-006 (shares layout shell), CHECKPOINT-1

CONSTRAINTS
  Next.js 14 App Router, TypeScript, Tailwind + shadcn/ui, Recharts for the radar chart.
  **Mandatory:** all archetype/burn-rate data must flow through a single client module (e.g.
  lib/api/pastClient.ts) so the PLACEHOLDER-A → real swap at Checkpoint-1 is a one-file change.

ENVIRONMENT SETUP CHECK
  Confirm TASK-001's shell runs (npm run dev) before adding PAST content.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b feat/FE-002-shell-past-page
3. Never push directly to main
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit: feat(FE): TASK-002 <description>
6. git push -u origin feat/FE-002-shell-past-page
7. git pull origin main --rebase before PR
8. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. npm run dev, click all 3 tabs
2. Scenario: select a demo persona, view PAST tab
3. Expected: archetype label + radar chart + burn-rate line render correctly against PLACEHOLDER-A
4. Edge case: no persona selected — page shows a prompt state, doesn't crash
5. No regression: shell nav still works
6. Evidence: screenshot of PAST tab against the placeholder, pasted before PR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  3-tab shell live, PAST page renders against PLACEHOLDER-A, single client module ready for the swap.

ACCEPTANCE TEST (at Checkpoint-1)
  1. Receive TASK-003's Placeholder Replacement Note
  2. Swap pastClient.ts's data source from the hardcoded PLACEHOLDER-A object to real fetch calls
     against /api/ml/classify and /api/ml/burn-rate
  3. Re-run steps 1-6 above against the real data, confirm no regression
  4. Delete the PLACEHOLDER-A hardcoded object entirely — no reason to keep it once swapped

BRANCH / FILE OWNERSHIP
  Branch : feat/FE-002-shell-past-page
  Files  : app/(faces)/layout.tsx, app/(faces)/past/*, components/PastPanel.tsx, lib/api/pastClient.ts

ESCALATION PATH
  Blocked >20 min → Kavya or Lead → fallback: keep placeholder longer, flag in DEBT_LEDGER

KNOWN RISKS
  Radar chart shape must match CONTRACT-002's distances object exactly — confirm field names with
  Vishvraj before Checkpoint-1, not after.

CONFLICT WATCH
  TASK-003 (issues the swap note you consume), TASK-006 (shares shell layout)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
