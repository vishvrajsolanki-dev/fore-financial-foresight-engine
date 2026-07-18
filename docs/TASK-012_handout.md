━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-012 — GROQ KEY ROTATION (Allen)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : Swap to a fresh Groq API key right before the live demo
Your Scope      : Generate a new, untouched Groq API key. Update GROQ_API_KEY on Vercel. Redeploy.
                  Run exactly ONE smoke-test call to confirm it works. Do not re-run the full
                  rehearsal script on this key.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  CONTRACT-008. The dev key used through TASK-001-011 may be rate-limited or partially exhausted
  from cumulative test traffic — that's expected and fine, it was never meant to survive to the demo.
  This task exists to guarantee the demo runs on a key with full untouched quota.

INTERFACE CONTRACT
  CONTRACT-008, in full.

DEPENDENCIES
  Waiting on     : TASK-011 (rehearsal fully complete — do not rotate before this)
  You deliver to : TASK-013 (freeze), the live demo itself

CONSTRAINTS
  Exactly one verification call. The purpose of this task is protecting quota, not re-testing
  functionality that TASK-011 already proved works.

ENVIRONMENT SETUP CHECK
  Confirm you have access to generate a new key in the Groq console before this task's clock starts
  — don't let account-access friction eat into the 10-min box.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
N/A — this is an env var change on Vercel, not a code change. No branch needed. If a redeploy is
required for the secret to take effect, trigger it directly from the Vercel dashboard or CLI
(`vercel --prod`), no PR needed for a secrets-only change.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Update GROQ_API_KEY on Vercel to the new key, redeploy
2. Scenario: ask exactly one DECIDE question on the live deployed URL
3. Expected: a real answer comes back, tool-call fires correctly — same behavior as rehearsal,
   confirmed on the new key
4. Edge case: if the new key fails this single call, immediately revert GROQ_API_KEY to the dev key
   and redeploy — a demo on a slightly-used dev key beats a demo on a broken new key
5. No regression: N/A, this is a credential swap, not a logic change
6. Evidence: screenshot of the one successful smoke-test response, timestamped
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  Live app running on a fresh, minimally-used Groq key, verified working, ready for TASK-013.

BRANCH / FILE OWNERSHIP
  N/A — Vercel dashboard/env var change only

ESCALATION PATH
  New key fails its smoke test → revert to dev key immediately, do not debug live in this slot,
  escalate to Lead after freeze if time allows

KNOWN RISKS
  Forgetting to redeploy after the env var change means the old key is still live in production —
  confirm the deploy timestamp updates before considering this task done.

CONFLICT WATCH
  N/A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
