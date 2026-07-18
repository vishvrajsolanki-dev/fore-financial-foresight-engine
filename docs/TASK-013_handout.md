━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-013 — FREEZE (ALL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : Whole team
Overall Task    : Final deploy confirm, standing by
Your Scope      : No new code from this point. Confirm the live URL is the correct final build.
                  Confirm the team has the backup video accessible. Reuse TASK-012's single
                  smoke-test result as the final verification — do not make additional Groq calls.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  This is the hard stop. Anything not merged and flag-verified by the start of this task does not
  make it into the demo, regardless of how close it is.

INTERFACE CONTRACT
  None — this task changes nothing, it confirms everything already true.

DEPENDENCIES
  Waiting on     : TASK-012 (key rotated and verified)
  You deliver to : The live demo

CONSTRAINTS
  No new code. No new Groq calls beyond what TASK-012 already made. Time-boxed at 15 min.

ENVIRONMENT SETUP CHECK
  N/A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
N/A — no commits in this task. Confirm `main` matches what's deployed (`git log` vs Vercel deploy
hash), nothing more.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open the live URL on the actual device that will be used for the demo (not a laptop that stays
   backstage) — confirm it loads there specifically
2. Scenario: N/A — no new test scenarios, this is confirmation only
3. Expected: everything verified in TASK-010/011/012 still holds on the demo device
4. Edge case: confirm venue wifi/network works for the demo device specifically — this is the one
   new check this task adds, since it wasn't testable earlier
5. No regression: confirm deploy hash matches the one verified in TASK-012
6. Evidence: screenshot of the live URL loading correctly on the demo device
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  Confirmed-live, confirmed-correct, confirmed-reachable-on-demo-device build. Team standing by.

BRANCH / FILE OWNERSHIP
  N/A

ESCALATION PATH
  If the demo device can't reach the live URL → switch to the backup video from TASK-011 immediately,
  don't troubleshoot networking live in front of judges

KNOWN RISKS
  Venue wifi is the one variable never fully testable until this exact task — this is why the backup
  video exists.

CONFLICT WATCH
  N/A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
