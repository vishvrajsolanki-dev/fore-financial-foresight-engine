━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-009 — BACKEND (Allen, paired with Kavya)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : Redeploy both services + error handling + loading states
Your Scope      : Redeploy the merged G2 branches — Vercel (Next.js) AND Render (Python ML
                  service, separately) — add error handling across the app (API failures, missing
                  persona, Render unreachable/cold, etc.), loading states for async calls.
Pairing note    : Allen owns this file. Kavya may execute this task in parallel with Allen's
                  TASK-008 this block — same accountability, Allen signs off either way.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  This is the safety-net task before Checkpoint-2 — a broken deploy or an unhandled error live on
  stage is worse than any missing feature.

INTERFACE CONTRACT
  None new — hardening around existing contracts, especially CONTRACT-006's error shape.

DEPENDENCIES
  Waiting on     : TASK-004 (deploy target exists), CHECKPOINT-1
  You deliver to : CHECKPOINT-2

CONSTRAINTS
  No new architecture — this is hardening, not feature work. Resist the urge to refactor.

ENVIRONMENT SETUP CHECK
  Confirm you can deploy the current main branch cleanly to BOTH targets — Vercel and Render —
  before making any changes. A redeploy that only hits one of the two is a silent half-deploy.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b feat/BE-009-redeploy-error-handling
3. Never push directly to main
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit: feat(BE): TASK-009 <description>
6. git push -u origin feat/BE-009-redeploy-error-handling
7. git pull origin main --rebase before PR
8. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. On the deployed URL (not localhost), deliberately trigger failure paths
2. Scenario: kill the Groq dev key temporarily, ask a DECIDE question; separately, simulate the
   Render service returning a 500 or being briefly unreachable (CONTRACT-006's error shape and
   warm-up assumption both need a graceful failure path here, not just a happy-path redeploy check)
3. Expected: visible, non-crashing error states in both cases — not a blank screen or unhandled
   exception
4. Edge case: navigate to AHEAD before PAST has ever run — sane empty state, not a crash
5. No regression: happy-path demo flow still works after adding error handling
6. Evidence: screenshots of both handled error states + confirmation the happy path still passes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  Live deployed URL, hardened against the failure modes most likely to occur live.

BRANCH / FILE OWNERSHIP
  Branch : feat/BE-009-redeploy-error-handling
  Files  : app/error.tsx, app/(faces)/*/loading.tsx, try/catch additions across API routes

ESCALATION PATH
  Blocked >20 min → Lead

KNOWN RISKS
  Don't let hardening scope-creep into a redesign — time-boxed at 20 min for a reason.

CONFLICT WATCH
  Touches files across all domains lightly — flag any file also modified by another branch this
  session, resolve via rebase, not silent overwrite.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
