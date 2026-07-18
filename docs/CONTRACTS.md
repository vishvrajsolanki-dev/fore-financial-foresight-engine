# FORE — CONTRACTS.md
Append-only. Changing a locked contract = explicit breaking-change flag + re-issue every dependent handout.

---

## STACK DECISION — LOCKED
```
ML language        : Python (FastAPI)
ML deploy           : Render — persistent always-on instance, funded by $100 Render credit.
                      Replaces the earlier Vercel-Python-functions plan specifically to remove
                      cold-start latency from canIAfford()'s critical path.
Frontend/BE language: TypeScript, Next.js 14 App Router, deployed on Vercel
Decided             : Vishvraj builds ML in Python (proven strength); Allen's chat route calls it
                      over HTTP to Render, not to a co-located Vercel function.
```
This is final for this build. Two deploy targets now exist on purpose — see STARK_TEAM_BRIEF.md's
tradeoff note. CORS between the Vercel domain and the Render domain is configured once in TASK-001.

---

## CONTRACT-001 — `financial_context` object (the spine)
```typescript
interface FinancialContext {
  session_id: string
  persona: string
  monthly_income: number
  archetype: {
    label: "Disciplined Saver" | "Impulsive Spender" | "The Foodie" | "Social Butterfly" | "Balanced Spender"
    distances: Record<string, number>
  } | null
  burn_rate: {
    daily_avg: number
    trend_slope: number
    projected_zero_balance_date: string
  } | null
  transactions: Transaction[]
  goal: {
    target_amount: number
    target_date: string
    on_pace: boolean
    pace_gap_days: number | null
  } | null
  last_decide_verdict: {
    item: string
    amount: number
    day_shift: number
    new_zero_balance_date: string
  } | null
  benchmark: { category: string; user_value: number; percentile: number }[] | null
}
```
Locked by: TASK-004 (Vishvraj, paired w/ Kavya). Consumed by: every task. Rule: no face computes and displays a number without writing it back here first.

## CONTRACT-002 — Archetype classifier (Python, hosted on Render)
```
Endpoint : POST {RENDER_ML_BASE_URL}/classify
Input    : { transactions: Transaction[], monthly_income: number }
Output   : { label: string, distances: Record<string, number> }
Method   : Euclidean distance to 5 fixed centroid vectors
```
**Centroid vectors — locked at TASK-003, re-tuning after lock is a breaking-change flag:**
```
[fill in exact centroid values once TASK-003's blueprint is approved]
```
Locked by: TASK-003. Consumed by: TASK-002 (PAST display, via PLACEHOLDER-A until swap), TASK-004 (context write).

## CONTRACT-003 — Burn-rate regressor (Python, hosted on Render)
```
Endpoint : POST {RENDER_ML_BASE_URL}/burn-rate
Input    : { transactions: Transaction[] }
Output   : { daily_avg: number, trend_slope: number, projected_zero_balance_date: string }
Method   : Linear regression, honestly labeled as a straight-line trend, no forecasting-accuracy claim
```
Locked by: TASK-003. Consumed by: TASK-005/007/008.

## CONTRACT-004 — `canIAfford(item, amount)` tool-call
```
Endpoint (Python) : POST {RENDER_ML_BASE_URL}/can-i-afford
Called by          : Next.js DECIDE route (Allen, TASK-005/008) via HTTP, cross-origin to Render
Input              : { item: string, amount: number, transactions: Transaction[] }
Output             : { affordable: boolean, day_shift: number, new_zero_balance_date: string, explanation: string }
Rule               : real function, not a prompt-only estimate. Re-runs CONTRACT-003's regression with
                     the hypothetical expense inserted, returns the actual delta.
Rule               : the LLM MUST call this function before stating any day-shift number. A number stated
                     without a matching call is a contract violation — flag 🔴 regardless of plausibility.
```
Locked by: TASK-005 (stub shape), real implementation TASK-007. Consumed by: TASK-008 (chat UI narrates return value) — **zero-swap**: TASK-008 builds against this exact shape from day one; TASK-007 replaces the internal stub logic without changing the interface, so no Placeholder Replacement Note is needed for this one — the contract lock itself is what makes that safe.

## CONTRACT-005 — Benchmark JSON (static)
```json
{
  "income_bracket": "string",
  "city_tier": "string",
  "categories": [{ "category": "string", "percentiles": { "p25": 0, "p50": 0, "p75": 0, "p90": 0 } }]
}
```
Locked by: TASK-004 (Vishvraj, paired w/ Kavya). Consumed by: TASK-006. Generated once before the build starts — never live-generated during the demo.

## CONTRACT-006 — Next.js ↔ Render HTTP contract (governs all 3 ML endpoints above)
```
Base URL     : RENDER_ML_BASE_URL env var, e.g. https://fore-ml.onrender.com — set on Vercel,
               never hardcoded in the Next.js codebase
CORS         : Render FastAPI app must allow the Vercel domain explicitly (not "*") —
               configure in TASK-001, verify in TASK-001's own smoke test
Auth         : none — internal call, demo scope, but now genuinely cross-origin (two different
               domains), unlike the earlier same-project-function assumption
Timeout      : 5s client-side; DECIDE route must show a graceful "still checking" state past 2s,
               not a silent hang (see TASK-008 Testing & Verification)
Error shape  : { error: string } on any 4xx/5xx — Next.js route must not crash the chat UI on this
Warm-up      : Render instance must be provisioned on an always-on tier (not free/spin-down) —
               confirmed in pre-kickoff prep, re-verified in TASK-001. If it spins down anyway,
               a cold hit here is the single biggest live-demo risk in the whole build.
```
Locked by: TASK-001 (Render provisioning + CORS), confirmed by TASK-003/TASK-005.

## CONTRACT-009 — ElevenLabs voice narration (Tier 2, TIER2-11)
```
Trigger  : after canIAfford() returns and the chat UI renders the verdict text
Call     : ElevenLabs text-to-speech API, narrating the verdict.explanation field verbatim
Scope    : OUTPUT ONLY — no speech-to-text, no live mic input anywhere in this build
Gate     : NEXT_PUBLIC_FEATURE_VOICE_NARRATION, default false, per CONTRACT-007
Fallback : if the ElevenLabs call fails or times out, the text verdict already on screen is
           sufficient — narration is additive, never load-bearing for the demo to make sense
```
Locked by: whoever pulls TIER2-11 (see ROADMAP.md).

## CONTRACT-010 — Exa grounding (Tier 2, TIER2-12)
```
Trigger  : DECIDE mentions a specific item — Exa searches for a real reference price/context
Call     : Exa search API, one query per DECIDE question, result summarized into the model's
           context before it narrates the tool-call answer (does NOT replace canIAfford() —
           this is additional grounding text, the affordability number still only comes from
           canIAfford()'s real return value, per CONTRACT-004's rule)
Gate     : NEXT_PUBLIC_FEATURE_EXA_GROUNDING, default false, per CONTRACT-007
Fallback : if Exa is slow or errors, DECIDE proceeds without the grounding line — never blocks
           or delays the core affordability answer waiting on a search call
```
Locked by: whoever pulls TIER2-12 (see ROADMAP.md).

## CONTRACT-007 — Tier 2 fail-safe (feature flags)
```
Every Tier 2 item ships behind an env var flag: NEXT_PUBLIC_FEATURE_<NAME>, default "false".
Build order  : branch off main → build → test in isolation on the branch's own Vercel preview URL →
               only then merge to main AND flip the flag together, in the same PR.
Rollback     : flag flip to "false" is the first response to any regression — takes effect on next
               request, no redeploy needed for Vercel env vars marked "Preview + Production, no rebuild
               required" — confirm this setting in Vercel project config during TASK-001.
Hard rule    : merging code without its flag OFF-by-default is a contract violation, not a style choice.
```
Locked by: TASK-001. Governs: every TIER2-0X item in ROADMAP.md.

## CONTRACT-008 — Groq API key rotation
```
Dev/test key  : used TASK-001 through TASK-011 (rehearsal included) — this key may hit rate limits from
                cumulative test traffic, that's expected and fine, it is never used live.
Rotation      : TASK-012, AFTER rehearsal is fully complete, BEFORE the live demo. Swap GROQ_API_KEY on
                Vercel to a freshly generated key. Redeploy (env var change requires redeploy for secrets).
Verification  : exactly ONE smoke-test call on the new key — confirm it responds, do not re-run the full
                rehearsal script again, that defeats the purpose of protecting its quota.
Fallback      : if the new key fails its single smoke test, revert GROQ_API_KEY to the dev key
                immediately — a demo on a slightly-used dev key beats a demo on a broken new key.
```
Locked by: TASK-012.

---

## PLACEHOLDER CONTRACTS

### PLACEHOLDER-A — Archetype + burn-rate display stub (stand-in for TASK-003's real output)
```json
{
  "archetype": { "label": "Balanced Spender", "distances": { "Disciplined Saver": 4.2, "Impulsive Spender": 6.1, "The Foodie": 5.5, "Social Butterfly": 5.8, "Balanced Spender": 1.9 } },
  "burn_rate": { "daily_avg": 850, "trend_slope": -12.5, "projected_zero_balance_date": "2026-09-14" }
}
```
Built by: TASK-002 (Drashti), during Parallel Build 1 only.
**Superseded by:** TASK-003's real classifier/regressor output, at Checkpoint-1.
**Mandatory Placeholder Replacement Note** (TASK-003's Mode 4 Session Log must include):
```
PLACEHOLDER REPLACEMENT NOTE
  Placeholder ID       : PLACEHOLDER-A
  Real vs Placeholder  : [exact diff — any field Vishvraj's real output adds/removes/renames vs the stub above]
  Consumer(s) to notify: TASK-002 (Drashti)
  Exact swap location  : frontend/api client for PAST — e.g. lib/api/pastClient.ts, replace the hardcoded
                         object import with the real fetch to /api/ml/classify + /api/ml/burn-rate
  Placeholder fallback : delete the hardcoded stub once swapped — no reason to keep it as a fallback,
                         the real endpoint is stable infra by Checkpoint-1
```
Drashti's responsibility on receiving the note: swap the exact location named, re-run PAST's own Testing & Verification against the real endpoint, confirm no regression, as part of Checkpoint-1 — not a separate task.

Note: Vishvraj now owns both TASK-003 (classifier/regressor) and TASK-004 (data/contract file) this
block, paired with Kavya so both land inside the same G1 window — he is both the issuer of this note
and the author of the data it's tested against, so cross-check his own two outputs against each other
before handing off, not just against the placeholder shape.

---

## Git protocol
1. `git checkout main && git pull origin main`
2. Branch: `<domain>/<TASK-ID>-<slug>`
3. Never push directly to main — branch + PR only
4. New dependency → pin exact version (no `^` / `~`) — record above
5. Commit format: `<type>(<domain>): <TASK-ID> <description>`
6. Before PR: `git pull origin main --rebase`
7. Squash merge after review → delete branch

Domain prefixes: `FE` (Drashti), `ML` (Vishvraj), `BE` (Allen). Kavya commits under the owning domain's branch when pairing — no separate `KV` prefix, ownership stays with the named task owner.
