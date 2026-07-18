━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-011 — DEMO REHEARSAL (ALL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : Whole team
Overall Task    : Run the full pitch twice, timed, record a backup video
Your Scope      : Execute the demo moment script (PAST → DECIDE → AHEAD, one question) end to end,
                  twice, on the live deployed URL, using the DEV Groq key — the fresh key is not
                  touched yet (see TASK-012, next).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  This is still "testing" for the purposes of CONTRACT-008 — burn dev-key quota here freely, that's
  what it's for. Do not rotate the Groq key before this task is fully done.

INTERFACE CONTRACT
  None new.

DEPENDENCIES
  Waiting on     : Tier 2 window closed (whatever was pulled, tested, and merged)
  You deliver to : TASK-012 (key rotation happens right after this)

CONSTRAINTS
  Time-boxed at 25 min. If any Tier 2 item pulled during the window causes a rehearsal failure,
  flip its feature flag off immediately (CONTRACT-007) rather than debugging live during this slot.

ENVIRONMENT SETUP CHECK
  Confirm the deployed URL reflects the final merged state, including any Tier 2 merges, before
  starting the first run-through.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
N/A — no code changes in this task unless a Tier 2 flag needs flipping off, which follows the
standard protocol in CONTRACTS.md CONTRACT-007.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Full run-through #1: PAST persona select → DECIDE affordability question → AHEAD pace check
2. Scenario: time it, note any hesitation or rough transition
3. Expected: under 60 seconds for the core moment, matches the pitch script in STARK_TEAM_BRIEF.md
4. Full run-through #2: repeat, this time record it as the backup video
5. Edge case: deliberately ask an unscripted but realistic follow-up question during run #2, confirm
   it still holds up
6. Evidence: the recorded backup video itself, saved and accessible before TASK-012 starts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  Two clean timed run-throughs, one backup video recorded, any Tier 2 issue resolved via flag-off.

BRANCH / FILE OWNERSHIP
  N/A — no commits expected unless a flag flip is needed

ESCALATION PATH
  N/A — whole team present

KNOWN RISKS
  Do not let a Tier 2 feature's rough edge eat into rehearsal time — flag it off and move on, fix
  later only if genuinely trivial.

CONFLICT WATCH
  N/A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
