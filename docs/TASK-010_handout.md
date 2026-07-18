━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-010 — POLISH (ALL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : Whole team
Overall Task    : Disclaimer line, Cmd+K styling pass, edge cases
Your Scope      : Add the visible "not licensed financial advice" disclaimer, run Cmd+K micro-edits
                  for visual consistency across all 3 faces, sweep for remaining edge cases found
                  during Checkpoint-2.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  Tier 1 is functionally complete after Checkpoint-2 — this task is about the product feeling
  finished, not about new logic. No new contracts, no new endpoints.

INTERFACE CONTRACT
  None — UI/copy only.

DEPENDENCIES
  Waiting on     : CHECKPOINT-2 passed clean
  You deliver to : Tier 2 window (starts after this), TASK-011 (rehearsal)

CONSTRAINTS
  Time-boxed at 25 min. Anything that isn't a quick Cmd+K edit belongs in Tier 2, not here.

ENVIRONMENT SETUP CHECK
  N/A — working directly on the already-deployed app.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b chore/ALL-010-polish
3. Never push directly to main
4. Commit: chore(ALL): TASK-010 <description>
5. git push -u origin chore/ALL-010-polish
6. git pull origin main --rebase before PR
7. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Full click-through of all 3 tabs on the deployed URL
2. Scenario: repeat the full demo-flow question sequence once more
3. Expected: disclaimer visible on every face, no visual inconsistency between tabs, no regression
   from polish edits
4. Edge case: N/A — this task closes out known edge cases, doesn't open new ones
5. No regression: this is the check — confirm nothing broke from the styling pass
6. Evidence: full-flow screen recording, before PR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  Tier 1 product, polished, disclaimer visible, ready for the Tier 2 window.

BRANCH / FILE OWNERSHIP
  Branch : chore/ALL-010-polish
  Files  : component-level styling across app/(faces)/*

ESCALATION PATH
  N/A — whole team present

KNOWN RISKS
  Scope creep — a "quick style fix" that touches logic belongs in Tier 2 with its own flag, not here.

CONFLICT WATCH
  N/A, single combined session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
