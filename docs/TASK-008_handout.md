━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-008 — BACKEND (Allen)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : DECIDE chat UI + full tool-call wiring + prompt tuning
Your Scope      : User-facing chat interface for DECIDE, wired to your own TASK-005 route, with
                  prompt tuning so the model reliably narrates the tool's return value. Vishvraj's
                  TASK-007 lands behind the same CONTRACT-004 shape you're already building against
                  — no swap needed on your end, just re-test once it's real.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  This is the moment judges remember. Prioritize reliability of the tool-call trigger over UI polish
  — a beautiful chat box that occasionally hallucinates fails the whole pitch.

INTERFACE CONTRACT
  CONTRACT-004 unchanged. UI must visibly reflect when the tool was called (a small "checked your
  numbers" indicator) — this is the trust signal, don't hide it. CONTRACT-006's 2s-graceful-wait
  behavior must show in the UI, not just exist in the backend.

DEPENDENCIES
  Waiting on     : TASK-005 (your own route), CHECKPOINT-1
  You deliver to : CHECKPOINT-2, TIER2-01 (self-verification pass, if pulled)

CONSTRAINTS
  Same Next.js/Tailwind/shadcn stack. Chat state can be local component state.

ENVIRONMENT SETUP CHECK
  Confirm TASK-005's route responds correctly via curl before wiring UI to it.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b feat/BE-008-decide-chat-ui
3. Never push directly to main
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit: feat(BE): TASK-008 <description>
6. git push -u origin feat/BE-008-decide-chat-ui
7. git pull origin main --rebase before PR
8. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. npm run dev, use the actual chat UI, no curl this time
2. Scenario: the exact demo-script question — "Can I afford a ₹15,000 laptop next month?"
3. Expected: answer states a specific day-shift number, UI shows the tool-was-called indicator
4. Edge case: rapid follow-up ("what about ₹5,000 instead?") — confirm it re-calls the tool with new
   numbers, doesn't reuse the stale first answer. Also test: simulate the Render service being
   unreachable (wrong URL temporarily), confirm the 2s-graceful-wait state shows instead of a
   silent hang, and that the CORS-configured cross-origin call doesn't fail silently in the browser
   console without surfacing to the user
5. No regression: TASK-005's route still passes its own curl test after UI changes
6. Evidence: screen recording or screenshots of both the question and the follow-up, before PR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  DECIDE tab fully functional end-to-end, reliable across at least 3 varied test questions, once
  re-tested against TASK-007's real math.

BRANCH / FILE OWNERSHIP
  Branch : feat/BE-008-decide-chat-ui
  Files  : app/(faces)/decide/*, components/DecideChat.tsx

ESCALATION PATH
  Blocked >20 min → Vishvraj (if numbers look wrong) or Lead (if tool-calling itself is flaky)

KNOWN RISKS
  Prompt tuning under time pressure can overfit to the demo question — test at least 2 other
  realistic questions, not just the scripted one.

CONFLICT WATCH
  TASK-007 (real math feeding this UI), TASK-006 (AHEAD must reflect DECIDE verdicts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
