# FORE — ROADMAP.md
Cursor Hackathon Ahmedabad | Window: 4.5h (270 min)

**UNIQUE ANGLE (locked):** the LLM calling a real function live, on stage, instead of guessing the affordability math.

**Team:** Allen (BE) · Vishvraj (ML) · Drashti (FE) · Kavya (floating support, pairs on bottleneck tasks, no owned file)

**Excellence Benchmark:** Uniqueness 2 · Technical Depth 2 · Feasibility-in-time 2 · Demo Impact 2 · Core-loop Completeness 1 → **9/10**

**Time vs Scope:** Tier 1 fixed cost = 180 min / 270 min budget → **90 min buffer funds Tier 2.**

---

# TIER 1 — THE PRODUCT (mandatory, nothing else starts until this is done and verified)

Build → connect → test, in that order. A checkpoint failing is the only thing that pauses the clock — Tier 2 discussion doesn't happen until Checkpoint-2 passes clean.

## Task Board

| Task | Owner | Time | Depends On | Group |
|---|---|---|---|---|
| TASK-001 | Allen (all present) | 15 min | None | Setup |
| TASK-002 | Drashti | 30 min | TASK-001, PLACEHOLDER-A | G1 |
| TASK-003 | Vishvraj | 30 min | TASK-001 | G1 |
| TASK-004 | Vishvraj + Kavya (paired) | 30 min | TASK-001 | G1 |
| TASK-005 | Allen (solo) | 30 min | TASK-001 | G1 |
| **CHECKPOINT-1** | ALL | 15 min | G1 complete | Gate |
| TASK-006 | Drashti | 30 min | TASK-004 (real, done) | G2 |
| TASK-007 | Vishvraj | 30 min | TASK-003, CHECKPOINT-1 | G2 |
| TASK-008 | Allen | 30 min | TASK-005, CHECKPOINT-1 | G2 |
| TASK-009 | Allen + Kavya (paired) | 20 min | TASK-004, CHECKPOINT-1 | G2 |
| **CHECKPOINT-2** | ALL | 15 min | G2 complete | Gate |
| TASK-010 | ALL | 25 min | CHECKPOINT-2 | Polish |
| — | — | ~90 min | — | **Tier 2 window** |
| TASK-011 | ALL | 25 min | Tier 2 window closed | Rehearsal |
| TASK-012 | Allen | 10 min | TASK-011 | Key rotation |
| TASK-013 | ALL | 15 min | TASK-012 | Freeze |

**Fixed wall-clock total: 180 min.** Full handouts: TASK-001 through TASK-013_handout.md.

## Note on TASK-004 and TASK-008/009 pairing (rebalanced)
Load is split so no one person carries a double task alone: Vishvraj owns TASK-003 (his own ML work)
*and* TASK-004 (data generation — a natural fit, since the synthetic data is what his own classifier
gets tested against) in G1, paired with Kavya so both land inside the same 30-min window. Allen has
exactly one task in G1 (TASK-005) and picks up the double load in G2 instead (TASK-008 + TASK-009),
where Kavya pairs with him. This keeps every person's wall-clock load close to even across the whole
build — Allen ~90 min, Vishvraj ~90 min, Drashti ~60 min (frontend-only, unchanged) — rather than
concentrating it all on one person for the entire session. If Kavya is unavailable for either block,
that block's paired task genuinely runs sequentially after the other and extends by its own length —
flag this at kickoff so the schedule can be replanned (Mode 7) rather than discovered at a checkpoint.

## G1 — starts at 0:15, parallel
- Drashti: TASK-002 (shell + PAST page, against PLACEHOLDER-A)
- Vishvraj: TASK-003 (Python classifier + regressor microservice)
- Kavya (paired w/ Vishvraj): TASK-004 (synthetic data + benchmark JSON + contract file + deploy)
- Allen (solo): TASK-005 (DECIDE route skeleton + Groq wiring + canIAfford stub)

**CHECKPOINT-1 (0:45–1:00) — Integration Test 1 + PLACEHOLDER-A swap**
```
[ ] PAST page swapped from PLACEHOLDER-A to TASK-003's real Render-hosted /classify + /burn-rate output
[ ] Archetype label spot-checked by hand against CONTRACT-002's centroid math on 1 known transaction set
[ ] financial_context actually populated after PAST runs — log it, don't assume
[ ] DECIDE route (TASK-005) responds with a stub matching CONTRACT-004's shape
[ ] Render instance confirmed warm — hit it twice in a row, second call should not be meaningfully
    slower than the first (rules out spin-down risk before it becomes a live-demo problem)
[ ] CORS confirmed working cross-origin (Vercel → Render), not just same-origin localhost testing
[ ] Deployed URL live and reachable, not just localhost
Verdict: ✅ proceed to G2 / 🔴 fix before G2 — no parallel work begins on a broken spine
```

## G2 — starts at 1:00, blocked by Checkpoint-1
- Drashti: TASK-006 (AHEAD UI — real benchmark data, no placeholder needed)
- Vishvraj: TASK-007 (canIAfford real math in the Python service)
- Allen: TASK-008 (DECIDE chat UI + tool-call wiring — zero-swap against CONTRACT-004)
- Kavya (paired w/ Allen): TASK-009 (redeploy both services + error handling)

**CHECKPOINT-2 (1:30–1:45) — Integration Test 2**
```
[ ] "Can I afford a ₹15,000 laptop next month?" → real day-shift number, sourced from a verified
    Vercel→Render /can-i-afford network call, not the chat text alone
[ ] AHEAD panel reflects the SAME financial_context after the DECIDE verdict
[ ] Benchmark percentile renders correctly for the active persona's bracket
[ ] Vercel→Render HTTP call (CONTRACT-006) tested for its 2s-graceful-wait behavior AND for a
    genuinely cold Render instance if it ever spun down since Checkpoint-1 — re-verify warmth
Verdict: ✅ Tier 1 complete, proceed to Polish + Tier 2 / 🔴 fix — regardless of time remaining
```

---

# TIER 2 — PRICED UPGRADE MENU, FAIL-SAFE BY DESIGN

**Fail-Safe Protocol (CONTRACT-007, mandatory for every item below):**
1. Branch off `main` (never off another Tier 2 branch)
2. Build, gated behind `NEXT_PUBLIC_FEATURE_<NAME>`, default `false`
3. Test in total isolation on that branch's own Vercel preview URL — the main demo URL is never touched during this step
4. Merge to `main` AND flip the flag to `true` in the same PR, only after isolated testing passes
5. Any regression detected on the main demo URL after a Tier 2 merge → flip the flag back to `false` immediately. This must restore Tier 1 behavior within 2 minutes, with no redeploy needed if the Vercel env var is configured for instant propagation (confirm this in TASK-001).
6. Log every merge in a running Tier 2 Merge Log: item / branch / flag / merge time / rollback tested Y-N

**Pull rule:** one item at a time. Do not start building the next item until the current one has passed step 3 (isolated test) — a half-built Tier 2 item sitting on `main` unflagged is itself a risk.

| # | Item | Value | Build | Test (isolated) | Total | Depends On |
|---|---|---|---|---|---|---|
| TIER2-01 | DECIDE self-verification pass — second cheap model call checks the tool-call's own answer before showing the user | Highest — same category as ARGUS's critic-agent differentiator | 30 min | 15 min | **45 min** | TASK-007 |
| TIER2-11 | ElevenLabs voice narration of the DECIDE verdict — output only, no live mic | High — strong live-demo moment, funded by 100K free credits, output-only keeps risk low | 20 min | 10 min | **30 min** | TASK-008 |
| TIER2-02 | Second demo persona/dataset switcher | High — judge interactivity | 20 min | 10 min | **30 min** | TASK-004 |
| TIER2-12 | Exa-grounded real price/context check inside DECIDE | Medium-high — real-world grounding is a genuine differentiator, but adds a live search call to a chat turn | 25 min | 15 min | **40 min** | TASK-008 |
| TIER2-03 | `financial_context` persisted to browser storage (survive refresh, still no backend/auth) | Medium-high | 20 min | 15 min | **35 min** | TASK-009 |
| TIER2-04 | Additional benchmark category (transport/entertainment) | Medium | 20 min | 10 min | **30 min** | TASK-004, TASK-006 |
| TIER2-05 | Dark mode toggle | Medium | 15 min | 10 min | **25 min** | TASK-002, TASK-006 |
| TIER2-06 | Chart transition animation | Low-medium | 15 min | 5 min | **20 min** | TASK-002 |
| TIER2-07 | Loading skeletons | Low-medium | 10 min | 5 min | **15 min** | any UI task |
| TIER2-08 | Multi-currency toggle | Low | 20 min | 15 min | **35 min** | TASK-003 |
| TIER2-09 | Voice INPUT on DECIDE (Web Speech API) — **still flagged risk:** live mic on stage. Note: Flow is a personal dictation tool, not usable here — it dictates into whatever app has OS focus, not into a specific web form reliably on a strange demo device | Low-medium value, real risk | 30 min | 15 min | **45 min** | TASK-008 |
| TIER2-10 | Export AHEAD summary as image | Low | 25 min | 15 min | **40 min** | TASK-006 |

**Suggested pull order against a 90-min buffer:** TIER2-01 (45) → TIER2-11 (30) leaves 15 min → TIER2-07 (15) → stop, bank any remainder into Rehearsal. TIER2-11 jumped ahead of TIER2-02 in this ordering because it's now funded, low-risk (output-only), and a stronger live moment than a persona switcher — recompute live if the buffer ends up larger or smaller than 90 min. TIER2-12 (Exa) is deliberately not in the default pull path — it's a real search call on a chat turn judges are timing; only pull it if TIER2-01 and TIER2-11 are both done, tested clean, and at least 40 min remain.

---

# TIER 3 — EXCLUDED, NOT RECOMMENDED EVEN IF FULL BUFFER REMAINS

| Item | Why it stays out |
|---|---|
| Real JWT auth | Judgment risk (token rotation, revocation testing), not a typing-speed problem — Cursor's speed doesn't buy back that review discipline |
| Persistent database | No demoed feature needs cross-session persistence — pure added deploy risk |
| Real bank integration | Credential-handling risk, not achievable safely in this window regardless of tooling |
| Seasonal forecasting (Prophet etc.) | Dataset doesn't have enough signal for it to outperform a trend line |

State these four, unprompted, before a judge asks.

## Cut Log (disclosed)
- Auth, DB, real bank data, seasonal forecasting → Tier 3, reasoning above, not hidden
- TypeScript-only ML path → not chosen; Python locked instead, per team's proven strength (see STARK_TEAM_BRIEF.md)
- Single-deploy-target (Vercel-only) → reversed for the Python service specifically; Render's
  always-on instance removes cold-start risk from canIAfford()'s critical path, which was judged
  worth the added complexity of a second deploy target — see STARK_TEAM_BRIEF.md's tradeoff note
