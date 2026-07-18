# FORE — STARK_TEAM_BRIEF.md
Cursor Hackathon Ahmedabad | Window: 4.5h (270 min) | Domain: AI for Everyday Experiences

## What we're building
One platform, three linked faces on a shared data spine:
- **PAST** — spending archetype (Euclidean distance to 5 fixed centroids) + burn-rate trend + zero-balance projection
- **DECIDE** — "can I afford X" chat, grounded by a real tool-call function, never a guessed number
- **AHEAD** — single-session goal pace calculator + static peer-benchmark percentile

**The one thing judges should remember:** the model calling a real function live on stage instead of inventing the affordability math.

## Team (locked)
| Name | Domain | Owns |
|---|---|---|
| **Allen** | Backend (BE) | Next.js API routes, Groq wiring, chat integration, redeploy/error handling, key rotation |
| **Vishvraj** | ML/Logic (ML) | Python FastAPI microservice — archetype classifier, burn-rate regressor, `canIAfford` math — **plus** synthetic data + benchmark JSON + `financial_context` contract file (rebalanced from Backend, see below) |
| **Drashti** | Frontend (FE) | All UI — shell, PAST/DECIDE/AHEAD pages, charts. Frontend only, no other domain load. |
| **Kavya** | Floating support | Pairs on whichever task is the bottleneck that block — Vishvraj's in G1 (TASK-004), Allen's in G2 (TASK-009). Does not own a task file. Contributes under the named owner's accountability; owner still signs the Session Log. |

**Load balance (non-shared tasks):** Allen ~90 min · Vishvraj ~90 min · Drashti ~60 min. Data
generation (TASK-004) moved from Backend to ML because it's calibrated to feed Vishvraj's own
classifier — keeping it in his domain also means one person owns "is the demo data realistic AND
does the model classify it correctly" end to end, instead of splitting that judgment call across
two people.

## Stack (LOCKED — do not revisit mid-build)
```
ML language      : Python (FastAPI)
ML deploy        : Render — persistent, always-on instance (funded by $100 Render credit).
                   Chosen over Vercel Python serverless functions specifically to eliminate
                   cold-start latency risk inside canIAfford()'s critical path — the one moment
                   judges are watching most closely.
Frontend/BE lang  : TypeScript, Next.js 14 App Router
Chat orchestration: Next.js API route (Allen) — calls the Render service over HTTP for real math
Styling          : Tailwind CSS + shadcn/ui
Charts           : Recharts
State            : In-memory server object (financial_context), no DB
Chat/LLM         : Groq API + Llama 3.1, real tool-calling
Voice (Tier 2)   : ElevenLabs — DECIDE verdict narrated aloud, output only, no live mic dependency
Grounding (Tier 2): Exa — real price/context lookup, feature-flagged like any live network call
Synthetic data   : Pre-built JSON, generated once before the build starts
Auth             : None — single hardcoded demo session
Deployment       : Vercel (Next.js app) + Render (Python ML service) — two targets, see tradeoff below
Version control  : GitHub, public repo
```
**Tradeoff, stated plainly:** the original plan consolidated to one deploy target on purpose, to reduce
failure surface. This build reverses that specifically for the Python service, because a warm Render
instance removes a real, demonstrated risk (serverless cold starts) from the single moment the whole
pitch depends on. Two targets is more moving parts; an unpredictable delay on "can I afford this" live
on stage is worse. CORS between the two domains is handled once, in TASK-001, not discovered later.

**Pre-kickoff prep (not part of the 270-min build clock, do this before Day-of):**
- Create the Render account, link the GitHub repo, provision the FastAPI service skeleton (empty
  "hello world" endpoint) so TASK-001 confirms it responds rather than provisions it from scratch
- Get API keys ready in a shared secure note: Groq (dev key), ElevenLabs, Exa — nothing is pasted
  into code, only into env vars, per the existing key-handling discipline in CONTRACT-008
- Confirm the Render instance tier keeps it always-on (not a free tier that spins down on idle) —
  the $100 credit should be spent here specifically, this is the one place spin-down defeats the
  entire point of switching off Vercel functions

## Credits & tooling map (why each one is used, or deliberately isn't)
| Credit | Used for | Notes |
|---|---|---|
| Cursor Pro ($30) | Running the whole build | No plan change — just headroom to run parallel Agent Mode sessions (Allen/Vishvraj/Drashti/Kavya simultaneously) without rationing usage |
| Render ($100) | Python ML service hosting | Primary architecture change — see Stack block above |
| ElevenLabs (100K) | TIER2-11 — DECIDE verdict narrated aloud | Output-only voice, see ROADMAP.md Tier 2 menu |
| Exa ($50) | TIER2-12 — real price/context grounding | Live search call, same fail-safe treatment as any Tier 2 network dependency |
| Flow (3mo Pro) | **Not a product feature.** Personal dictation for whoever's writing long Cursor prompts | Useful for talking through an Agent Mode prompt instead of typing it — team productivity only, nothing wired into FORE itself |

## What we are NOT building (Tier 3 — see ROADMAP.md for full reasoning)
Auth, persistent database, real bank integration, seasonal forecasting. Disclosed cuts — say this on stage before a judge asks.

## The tier system
**Tier 1 is the entire product**, not "the important part." PAST + DECIDE + AHEAD sharing one live `financial_context`, verified at two checkpoints, is the whole demo. Nothing in Tier 2 starts until Checkpoint-2 passes clean.

**Tier 2 upgrades are built and tested in total isolation from Tier 1**, behind a feature flag, on their own branch, verified on their own preview URL before ever touching the main demo branch. See ROADMAP.md's Fail-Safe Protocol — this is the mechanism that guarantees a broken upgrade can never take the core demo down with it.

**Tier 3 is excluded regardless of time remaining** — the reasoning is about risk category, not about hours available.

## Placeholder protocol (used exactly once in this build)
Drashti's PAST page (TASK-002) and Vishvraj's classifier microservice (TASK-003) run in the same parallel block — Drashti cannot wait for real archetype output that doesn't exist yet at that moment. TASK-002 builds against **PLACEHOLDER-A** (exact shape in CONTRACTS.md) for that one window; the swap to real data happens as part of Checkpoint-1, tracked via TASK-003's mandatory Placeholder Replacement Note. Every other Tier 1 dependency in this build is sequenced so the real thing already exists by the time its consumer starts — no other placeholder is needed. Full logic in ROADMAP.md / CONTRACTS.md.

## Groq API key protocol
Development/testing uses one key throughout the build and rehearsal. A **fresh, untouched key is swapped in right before the live demo** (TASK-012), after rehearsal is fully done — not before. This protects the demo from hitting rate limits or quota exhaustion caused by dev/test traffic. Full protocol in CONTRACTS.md CONTRACT-008.

## Git protocol (all tasks)
1. `git checkout main && git pull origin main`
2. Branch: `<domain>/<TASK-ID>-<slug>` e.g. `feat/BE-005-decide-route-skeleton`
3. Never push directly to main — branch + PR only
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit format: `<type>(<domain>): <TASK-ID> <description>`
6. Before PR: `git pull origin main --rebase`
7. Squash merge after review → delete branch
Domain prefixes: `FE`, `ML`, `BE`.

## Timeline
| Block | Time | What |
|---|---|---|
| Setup | 0:00–0:15 | TASK-001 |
| Parallel Build 1 | 0:15–0:45 | TASK-002, 003, 004, 005 |
| Checkpoint 1 | 0:45–1:00 | Integration Test 1 + PLACEHOLDER-A swap |
| Parallel Build 2 | 1:00–1:30 | TASK-006, 007, 008, 009 |
| Checkpoint 2 | 1:30–1:45 | Integration Test 2 |
| Polish | 1:45–2:10 | TASK-010 |
| **Tier 2 window** | **2:10–3:40 (~90 min buffer)** | Priced menu, fail-safe protocol governs every add |
| Rehearsal | 3:40–4:05 | TASK-011 (dev key) |
| Key rotation | 4:05–4:15 | TASK-012 (fresh key, minimal smoke test) |
| Freeze | 4:15–4:30 | TASK-013 |

See CURSOR_IMPLEMENTATION_GUIDE.md for how to run each task through Cursor with STARK.
