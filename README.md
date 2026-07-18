# FORE — The Financial Foresight Engine

Cursor Hackathon Ahmedabad · "AI for Everyday Experiences"

One platform, three linked faces on a shared data spine:

- **PAST** — spending archetype (Euclidean distance to 5 fixed centroids) + burn-rate trend + zero-balance projection
- **DECIDE** — "can I afford X" chat, grounded by a real tool-call function (`canIAfford()`), never a guessed number
- **AHEAD** — single-session goal pace calculator + static peer-benchmark percentile panel

**The one thing judges should remember:** the model calling a real function live on stage instead of inventing the affordability math.

## Team

| Name | Domain | Owns |
|---|---|---|
| Allen | Backend | Next.js API routes, Groq wiring, chat integration, redeploy/error handling, key rotation |
| Vishvraj | ML/Logic | Python FastAPI microservice — classifier, regressor, `canIAfford` math — plus synthetic data + benchmark JSON + `financial_context` contract file |
| Drashti | Frontend | All UI — shell, PAST/DECIDE/AHEAD pages, charts |
| Kavya | Floating support | Pairs on the bottleneck task each block (TASK-004, TASK-009) |

## Stack

```
Frontend/BE  : Next.js 14 App Router, TypeScript, Tailwind CSS + shadcn/ui, Recharts — on Vercel
ML service   : Python (FastAPI) — on Render, always-on instance (no cold starts on the demo path)
Chat/LLM     : Groq API + Llama 3.1, real tool-calling
State        : In-memory financial_context object — no database, no auth (see docs/ for why)
```

## Repo structure

```
app/                    Next.js App Router — layout, PAST/DECIDE/AHEAD pages, /api/decide route
components/             PastPanel, DecideChat, GoalPanel, BenchmarkPanel
lib/api/pastClient.ts   Single client module for PAST data (placeholder swap point)
lib/tools/canIAfford.ts DECIDE's tool-call definition
types/financialContext.ts  The shared data spine (CONTRACT-001)
data/                   Static synthetic personas + benchmark JSON (generated once, not at runtime)
ml-service/             Python FastAPI microservice — classify, burn-rate, can-i-afford
docs/                   Full STARK planning set — team brief, contracts, roadmap, all 13 task handouts
.cursor/rules           Auto-loaded context for every Cursor Agent Mode / Cmd+K session
```

## Start here

Read `docs/STARK_TEAM_BRIEF.md`, then `docs/CONTRACTS.md`, then your own `docs/TASK-0XX_handout.md`.
`docs/CURSOR_IMPLEMENTATION_GUIDE.md` covers exactly how to run each task inside Cursor.

**Nothing in this repo is implemented yet — every file is a skeleton/stub matching its locked
contract shape.** TASK-001 through TASK-013 build the real thing, in the order and timing laid out
in `docs/ROADMAP.md`.

## Disclaimer

Not licensed financial advice. Demo/hackathon build.
