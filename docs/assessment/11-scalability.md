# 11 — Scalability Review

## Current architecture

Next.js 14 (Vercel, serverless functions) + optional Postgres (Prisma) + optional Python
FastAPI on a single always-on Render `starter` instance + Groq/ElevenLabs/Exa APIs. The
deterministic math also runs inline inside Next.js (`ML_MODE=inline`), which — importantly —
means the "ML tier" already scales with Vercel's function fleet when inline mode is chosen.

## Ceiling analysis by tier

### API tier (Next.js)

| Constraint | Detail |
|------------|--------|
| No rate limiting | Any user (or anonymous caller, given the auth gaps) can hammer `/api/decide` — each call is up to 3 Groq completions (main + tool follow-up + critic) plus an optional Exa call |
| Payload amplification | Every DECIDE message uploads the full transaction array from the client (`components/DecideChat.tsx` L83–85); every `/api/context` GET returns the full decrypted history |
| No pagination | `sessionToContext` loads and AES-decrypts every transaction row per request (`lib/db/contextService.ts` L30–38) — CPU cost scales linearly with account age |
| Serverless fit | Routes are stateless and short — good; the 5s ML timeout (`lib/api/mlServer.ts`) bounds tail latency |

**Fixes:** per-user/IP rate limits (Upstash Ratelimit fits Vercel), server-side context loading
for DECIDE, cursor pagination on transactions, cache the spine summary (it changes only on
upload/patch, not per read).

### Database tier (Postgres/Prisma)

| Constraint | Detail |
|------------|--------|
| Unbounded growth | Transactions per session unbounded; deactivated sessions and revoked/expired refresh tokens are never pruned |
| Index coverage | `[sessionId, date]` and `[userId, isActive]` indexes exist — adequate for current queries |
| JSON columns | ML outputs in Json columns are fine at this scale; they become opaque to queries if analytics ever need aggregation across users (the real-benchmark roadmap will need proper tables) |
| Connections | Prisma on serverless needs a pooler (Neon/Supabase pgbouncer or Prisma Accelerate) before real traffic — nothing is configured today |

**Fixes:** scheduled pruning (expired tokens, sessions deactivated > N days), continuous-ledger
schema with statement provenance (also solves data stacking), pooled connections, and a
`benchmark_aggregates` table when real peer data lands.

### ML/statistics tier

| Constraint | Detail |
|------------|--------|
| Render service | Sync handlers, one uvicorn process, no autoscaling on `starter`; O(n) per request over the submitted transaction list; no auth from Next.js, no cache |
| Inline mode | Scales with Vercel automatically; duplication risk is the cost ([10](10-codebase-audit.md) #1) |

**Recommendation:** for the current *deterministic* math, consolidate on inline TS and retire
the Render service (one less deployment, free horizontal scale) — keep the Python service only
when trained models arrive, then run it with multiple uvicorn workers behind autoscaling, add a
service token, and cache classify results keyed by session content hash.

### AI (LLM) tier

| Constraint | Detail |
|------------|--------|
| Groq quota | 3 completions per DECIDE message; no request coalescing, caching, or budget guard; key rotation is manual (TASK-012) |
| No queue | Long-tail LLM latency is borne by the user request — acceptable for chat; batching only matters for the future classification-assist workload |

**Fixes:** per-user daily token budgets, cache Exa hints per item string, move any batch LLM
work (classification assist) to a queue (Vercel cron / QStash), provider abstraction
([08](08-local-ai-hybrid.md)) so local inference absorbs load for privacy-tier users.

### Storage tier

Raw CSVs are never stored (good — no blob growth). Encrypted descriptions add ~100–200 bytes
per row; 10k users × 2k transactions ≈ single-digit GB — Postgres is fine well past PMF. The
future need is object storage only if statement archival becomes a feature.

## Target production architecture (incremental, not a rewrite)

```mermaid
flowchart LR
    subgraph edge [Vercel]
        mw["Middleware: JWT verify + rate limit"]
        api["API routes (stateless)"]
        inline["Inline deterministic math"]
    end
    subgraph data [Data]
        pool["PgBouncer / pooled Prisma"]
        pg[("Postgres: ledger + sessions + aggregates")]
        cache["KV cache: spine summaries, Exa hints"]
    end
    subgraph asyncWork [Async]
        q["Queue (QStash/cron)"]
        ingest["CSV ingest + classification worker"]
        prune["Pruning + aggregation jobs"]
    end
    subgraph models [Model serving (when trained models exist)]
        pysvc["FastAPI, multi-worker, autoscaled, service token"]
    end
    mw --> api --> inline
    api --> pool --> pg
    api --> cache
    api --> q
    q --> ingest --> pg
    q --> prune --> pg
    api -.only for trained models.-> pysvc
```

## Priority order

1. Rate limits + auth on expensive endpoints (also the top security item).
2. Server-side DECIDE context + spine-summary caching.
3. Pagination + connection pooling.
4. Pruning jobs (tokens, stale sessions).
5. Consolidate deterministic math inline; retire Render until trained models need it.
6. Queue-based ingest when the classification pipeline v2 lands.
