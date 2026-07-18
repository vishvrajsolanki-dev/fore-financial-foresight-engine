━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-007 — ML (Vishvraj)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : canIAfford() real math — /api/ml/can-i-afford endpoint
Your Scope      : Replace TASK-005's stub with the real implementation — re-run CONTRACT-003's
                  regression with the hypothetical expense inserted, return the actual day-shift.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  This closes the anti-hallucination loop. This is a zero-swap task for Allen's side (CONTRACT-004's
  interface doesn't change) — you're filling in real logic behind an already-locked contract, not
  issuing a placeholder replacement note like TASK-003 did.

INTERFACE CONTRACT
  CONTRACT-004, input/output shape unchanged from the stub. New Python endpoint, called by Allen's
  Next.js route per CONTRACT-006.

DEPENDENCIES
  Waiting on     : TASK-003 (your own regressor), TASK-005 (stub to replace), CHECKPOINT-1
  You deliver to : TASK-008 (chat UI narrates your return value), CHECKPOINT-2

CONSTRAINTS
  Do not write a second regression path — insert the hypothetical expense into the transaction set
  fed to CONTRACT-003's existing regressor, reuse it.

ENVIRONMENT SETUP CHECK
  Confirm your CONTRACT-003 regressor function is importable and Allen's route compiles against the
  stub before starting.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b feat/ML-007-canIAfford-real
3. Never push directly to main
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit: feat(ML): TASK-007 <description>
6. git push -u origin feat/ML-007-canIAfford-real
7. git pull origin main --rebase before PR
8. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Unit test the endpoint directly against a known persona's data
2. Scenario: a ₹15,000 expense against a persona with a known burn rate — hand-calculate the
   expected day-shift, compare
3. Expected: returned day-shift matches the hand-calculation within rounding
4. Edge case: an expense large enough to push the zero-balance date into the past — confirm
   affordable: false with a sane explanation, not a crash or a negative date
5. No regression: TASK-003's baseline regressor output unchanged for the no-hypothetical-expense case
6. Evidence: pasted hand-calculation vs actual output, side by side, before PR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  /api/ml/can-i-afford returns verified-correct real numbers; Allen's stub fully superseded.

BRANCH / FILE OWNERSHIP
  Branch : feat/ML-007-canIAfford-real
  Files  : api/ml/can-i-afford.py

ESCALATION PATH
  Blocked >20 min → Lead → fallback: ship with the stub still active, flag 🔴 — this blocks
  Checkpoint-2 from passing cleanly, treat as highest-priority fix

KNOWN RISKS
  This is THE contract-violation risk in the whole product — test it more, not less, relative to its
  time box.

CONFLICT WATCH
  TASK-008 (consumes this via HTTP), TASK-005 (this replaces its stub's internal behavior)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
