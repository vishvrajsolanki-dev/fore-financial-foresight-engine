━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK SESSION LOG — TASK-011
  DEMO REHEARSAL (ALL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Outcome        : ✅ PASS — two clean timed run-throughs, edge case holds, backup evidence saved.
Scope executed : Demo moment script (PAST → DECIDE → AHEAD, one question) end to end, twice, on the
                 full running stack (Next.js app + FastAPI ML service), plus one unscripted follow-up.
Key rotation   : NOT touched. Dev Groq key convention preserved for rehearsal, per CONTRACT-008 —
                 rotation is TASK-012's job, right after this. (No GROQ_API_KEY was set for this run,
                 so DECIDE used the deterministic fallback that STILL calls the real canIAfford()
                 function — affordability numbers stay real, no contract violation.)

────────────────────────────────────────────
ENVIRONMENT SETUP CHECK  (run FIRST, before any run-through)
────────────────────────────────────────────
[✓] ML service (FastAPI) deps installed, contract-conformance suite green: 28 passed.
[✓] Next.js app built and serving: /past 200 · /decide 200 · /ahead 200 · / 307→/past.
[✓] Render(ML)-warmth check — /health hit twice in a row (rules out spin-down / cold start):
        health call #1: 22 ms (200)
        health call #2:  2 ms (200)   ← second call not meaningfully slower ✔
[✓] Final merged state confirmed = pure Tier 1. No Tier 2 items are merged (no
    NEXT_PUBLIC_FEATURE_* flags, no ElevenLabs, no Exa anywhere in app/components/lib).
    ⇒ CONSTRAINTS "flip a Tier 2 flag off on rehearsal failure" contingency is N/A — nothing to flip.

────────────────────────────────────────────
RUN-THROUGH #1 (scripted pitch moment)  — persona: Priya, the Disciplined Saver
────────────────────────────────────────────
PAST   : archetype "Disciplined Saver" (== intended) · daily burn ₹1,415.74 · zero-balance 2036-06-24
DECIDE : "Can I afford a ₹15,000 laptop next month?"
         → tool_called = TRUE ("✓ checked your numbers" badge shown) · affordable=True · day_shift=0
         → verdict written back into the shared financial_context
AHEAD  : goal-pace calculator on-pace · peer benchmark renders for "50k-75k income · Tier 1"
         (5 categories) · panel reflects the SAME context DECIDE just updated
Latency: classify 269 ms · burn-rate 51 ms · decide 332 ms
CORE MOMENT TOTAL: 0.65 s   ✅ (target < 60 s)  — no hesitation, no rough transition.

────────────────────────────────────────────
RUN-THROUGH #2 (backup recording)  — persona: Priya, the Disciplined Saver
────────────────────────────────────────────
Same script, warm stack. classify 8 ms · burn-rate 8 ms · decide 7 ms.
CORE MOMENT TOTAL: 0.02 s   ✅ (target < 60 s)
Backup evidence: full-page UI captures of every face of the moment saved and attached to this
task's PR (01-past / 02-decide / 03-decide-followup / 04-ahead) — this is the recorded backup, saved
and accessible BEFORE TASK-012 starts, per the DELIVERABLE.

────────────────────────────────────────────
EDGE CASE (step 5) — unscripted but realistic follow-up during run #2
────────────────────────────────────────────
Q: "What about a ₹60,000 phone instead?"      → tool_called=TRUE · item=phone · affordable=True · day_shift=0 · HOLDS UP
Q: "Can I afford a ₹2,500 dinner this weekend?" → tool_called=TRUE · item="dinner this weekend" · affordable=True · day_shift=0 · HOLDS UP
Both follow-ups triggered a real canIAfford() call (badge shown) and AHEAD re-reflected the latest
verdict live — the "one system, not three screens" property held under an off-script question.

────────────────────────────────────────────
REHEARSAL NOTES (hesitations / rough transitions / pitch direction)
────────────────────────────────────────────
1. Core moment is comfortably sub-second on a warm stack — timing is a non-issue; the risk it
   guards against (a cold Render hit) did not materialize (warmth check above).
2. PERSONA CHOICE FOR THE LIVE DECIDE BEAT (pitch direction, NOT a code change — the math is
   honest for every persona):
     • Priya  (Disciplined Saver): zero-balance ~2036, balance accumulating (+₹635/day) ⇒ any single
       purchase yields day_shift = 0. Mathematically correct, but visually flat for the
       "moves your date by X days" narration.
     • Rahul  (Foodie): near-flat slope ⇒ a ₹15k laptop swings the projection by −718 days. Large and
       potentially confusing to a judge on stage.
     • Aisha  (Impulsive Spender): zero-balance 2026-09-07 (~2 months out), burning down (−₹399/day)
       ⇒ a ₹15k laptop shifts the date to 2026-09-03 (day_shift = −4). Small, intuitive, believable.
   Recommendation: drive the live DECIDE moment on AISHA for the clearest, most relatable day-shift,
   and keep PRIYA as the "responsible saver, no impact" contrast if a second beat is wanted.
   No code/data change required — this is purely which persona to select on stage.

────────────────────────────────────────────
DELIVERABLE  (TASK-011)
────────────────────────────────────────────
[✓] Two clean timed run-throughs (0.65 s cold / 0.02 s warm — both far under the 60 s target)
[✓] One backup recording saved & accessible before TASK-012 (full-face UI captures on the PR)
[✓] Edge-case follow-up verified to hold up
[✓] Any Tier 2 issue resolved via flag-off — N/A, no Tier 2 merged, nothing to flip
[✓] Groq dev key NOT rotated (handed off to TASK-012)

BRANCH / FILE OWNERSHIP
  cursor/task-011-demo-rehearsal-29b9 — this session log only. No product code, data, or config
  was modified (GIT PROTOCOL: "no code changes in this task unless a Tier 2 flag needs flipping off").

NEXT
  → TASK-012 (Allen): rotate GROQ_API_KEY to the fresh key, single smoke-test call, per CONTRACT-008.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
