━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK SESSION LOG — TASK-012
  GROQ KEY ROTATION (Allen)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Outcome        : ⏸ CODE PATH VERIFIED GREEN — actual key swap is a human Vercel/Groq operation,
                 not executable from this environment (see "WHAT COULD NOT BE DONE HERE" below).
Scope executed : Full pre-rotation verification battery re-run on the running stack (Next.js app +
                 FastAPI ML service), plus exactly ONE DECIDE smoke-test question end to end.
Contract       : CONTRACT-008 (Groq API key rotation). Per its GIT PROTOCOL, the rotation itself is
                 an env-var change on Vercel + a redeploy — NO product code is modified by this task.
                 This file is a session log / evidence record only, matching the TASK-011 precedent.

────────────────────────────────────────────
ENVIRONMENT SETUP CHECK  (run FIRST)
────────────────────────────────────────────
[✓] Node v22.14.0 · npm 10.9.7 · Python 3.12.3
[✓] Node deps installed (`npm ci` → 448 packages)
[✓] ML deps installed (fastapi 0.112.0 · uvicorn 0.30.5 · numpy 1.26.4 · pytest 8.3.2 · httpx 0.27.0)
[✓] ML service (FastAPI) serving on 127.0.0.1:8000 — /health → {"status":"ok"}
[✓] Next.js production build serving on 127.0.0.1:3000 (`npm run start`, not dev)
[✓] Render(ML)-warmth check — /health hit twice back-to-back (rules out cold-start on the demo path):
        health call #1: 200 in 0.0015 s
        health call #2: 200 in 0.0010 s   ← second call not slower ✔

────────────────────────────────────────────
TEST BATTERY  (full green run)
────────────────────────────────────────────
[✓] ML contract-conformance suite   : `npm run test:ml`   → 28 passed
[✓] Lint                             : `npm run lint`      → No ESLint warnings or errors
[✓] Data/contract verify (TASK-004)  : `npm run verify`    → 5 brackets × 3 tiers, personas distinct, all passed
[✓] canIAfford verify (TASK-007)     : scripts/verify_task007_can_i_afford.py → all checks passed
[✓] Production build                  : `npm run build`     → compiled OK, types valid, 7/7 pages generated
[✓] Page routes on the running build : / → 307→/past · /past 200 · /decide 200 · /ahead 200

────────────────────────────────────────────
DECIDE SMOKE TEST  (step 2 — exactly ONE question, per CONSTRAINTS)
────────────────────────────────────────────
Persona   : Priya (Disciplined Saver) transactions from data/personas/persona-priya.json
Request   : POST /api/decide  { message: "Can I afford a ₹15,000 laptop next month?", transactions }
Response  : HTTP 200
            reply     : "Yes — you can afford laptop (₹15,000). It moves your projected zero-balance
                         date by 0 days (no change to the projected date), from 2036-06-24 to 2036-06-24."
            tool_called : TRUE      ← CONTRACT-004 satisfied: the number came from a real canIAfford()
                                       tool call → ML POST /can-i-afford, NOT from model/free text
            verdict     : { item: "laptop", amount: 15000, day_shift: 0,
                            new_zero_balance_date: "2036-06-24", affordable: true }
Path proved: DECIDE route → canIAfford() → callMl() → FastAPI /can-i-afford → real math → verdict.
Note        : No GROQ_API_KEY is set in this verification environment, so DECIDE used its deterministic
              fallback — which STILL calls the real canIAfford() function (numbers stay real, tool_called
              is TRUE, no contract violation). The Groq-keyed LLM branch of the same route is present and
              is lint-/type-/build-clean; exercising it live is exactly the human step below.

────────────────────────────────────────────
WHAT COULD NOT BE DONE HERE  (honest hand-off — requires a human with the accounts)
────────────────────────────────────────────
TASK-012's actual deliverable is a secrets/ops action on external dashboards, which this environment
has no access to. None of the following are possible from an isolated CI-style VM:
  ✗ Generate a fresh Groq API key   — needs Groq console login (no credentials injected here)
  ✗ Set GROQ_API_KEY on Vercel      — needs Vercel project access; `vercel` CLI + token not present
  ✗ Redeploy on Vercel              — same
  ✗ One smoke-test on the LIVE URL  — no deployed URL reachable from here
So the smoke test above was run against the LOCAL running stack instead, proving the code path is
healthy and ready to receive the rotated key.

HUMAN RUNBOOK (Allen, on the demo machine — CONTRACT-008 / TASK-012 handout, verbatim):
  1. Groq console → generate a fresh, untouched API key.
  2. Vercel → Project → Settings → Environment Variables → set GROQ_API_KEY to the new key (Production).
  3. Redeploy (Vercel dashboard redeploy or `vercel --prod`). Confirm the deploy timestamp updates —
     forgetting this leaves the OLD key live (KNOWN RISK in the handout).
  4. Ask exactly ONE DECIDE question on the live URL; confirm a real answer + tool-call fires. Do NOT
     re-run the full rehearsal — that defeats the quota-protection purpose.
  5. Evidence: timestamped screenshot of the one successful response.
  6. Fallback: if the new key fails that single call, immediately revert GROQ_API_KEY to the dev key and
     redeploy; escalate to Lead after freeze. Do not debug live in this slot.

────────────────────────────────────────────
DELIVERABLE  (TASK-012)
────────────────────────────────────────────
[✓] Code path verified ready for a rotated key (full battery green + one DECIDE smoke test, tool_called=TRUE)
[✓] GROQ_API_KEY confirmed env-var-only, never hardcoded (app/api/decide/route.ts:190, .env.example:10)
[ ] Live app running on a fresh Groq key  — HUMAN STEP (runbook above), cannot be done from this VM
[ ] Timestamped screenshot of the live smoke test — produced by the human step

BRANCH / FILE OWNERSHIP
  cursor/task-012-key-rotation-verify-3a72 — this session log only. No product code, data, or config
  changed (CONTRACT-008: rotation is a Vercel env-var change, not a code change).

NEXT
  → Human performs the runbook above, then TASK-013 (freeze) uses that single smoke-test result as its
    final verification — no additional Groq calls.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
