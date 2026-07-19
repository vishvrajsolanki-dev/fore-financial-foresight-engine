# 00 — Executive Project Assessment

## Verdict in one paragraph

FORE is a disciplined, well-documented hackathon build with one genuinely defensible idea —
**the LLM is never allowed to invent a financial number; it must call a real `canIAfford()`
function and narrate the result** — wrapped in an app whose "intelligence" is currently
hand-authored math, whose benchmarks are synthetic, whose OAuth buttons are stubs, and whose
AI endpoints are unauthenticated. The engineering hygiene (contracts, task handouts, 28 passing
tests, dual demo/full-stack modes) is well above hackathon average, which makes the gap between
what the product *implies* and what the code *does* the main risk. The path forward is not a
rewrite: it is (1) security hardening, (2) honesty fixes, (3) replacing authored heuristics with
trained models and real data, and (4) a product-surface upgrade (redesign, mobile, chatbot,
local-AI mode).

## Scorecards

| Dimension | Score | One-line rationale |
|-----------|:-----:|--------------------|
| Architecture | 7/10 | Clean App Router + contract-driven data spine; but full ML logic duplicated TS↔Python with no parity CI |
| Security | 4/10 | Real AES-256-GCM + JWT/refresh rotation, but unauthenticated AI endpoints, no rate limits, no security headers, presence-only middleware |
| AI/ML substance | 3/10 | Zero trained models; nearest-centroid + OLS + keyword regex presented under ML vocabulary; the tool-grounding pattern is the one real asset |
| Data integrity | 4/10 | Benchmarks and personas fully synthetic; "transport" benchmark row invented; one persona misclassifies against its own label |
| UI/UX | 6/10 | Coherent Warm Ledger theme, skeletons, empty states; but system fonts, emoji icons, dense wrapping topbar, only 2 charts, weak mobile |
| Code quality | 7/10 | Strict TS, tests, small modules; moderate dead code, drift between docs/env-flags and code |
| Scalability | 4/10 | No pagination, unbounded per-session history decrypted per request, sync single-process FastAPI, no queue/cache |
| Product differentiation | 5/10 | Forward-looking affordability + archetypes are a real wedge vs CRED/GPay; but currently indistinguishable from a demo without real data + real models |

## Top 10 findings

1. **No trained ML exists anywhere.** The "classifier" is Euclidean distance to 5 hand-authored
   centroids (`ml-service/centroids.py`, mirrored in `lib/ml/centroids.ts`); "burn rate" is
   hand-rolled OLS on a running balance (`ml-service/burn_rate.py`); `can-i-afford` re-runs that
   OLS with a hypothetical expense. `numpy` is declared in `ml-service/requirements.txt` but never
   imported. See [05-ai-ml-audit.md](05-ai-ml-audit.md).

2. **CSV transaction classification is keyword regex with a silent "shopping" default and no
   confidence score** (`lib/csv/parseBankCsv.ts` L32–38, L119–124). This is the direct root cause
   of the "how do you classify undefined payments?" criticism. See
   [02-hackathon-feedback-responses.md](02-hackathon-feedback-responses.md).

3. **Google/Microsoft/GitHub sign-in is fake.** The buttons log everyone into shared demo accounts
   (`demo-google@fore.app`) with a password hardcoded in source
   (`app/api/auth/demo/route.ts` L21). Email+JWT auth is real but only active when `DATABASE_URL`
   is set. See [04-authentication-upgrade.md](04-authentication-upgrade.md).

4. **`/api/decide`, `/api/ml/*`, and `/api/voice/narrate` require no authentication** — anyone can
   burn the Groq/ElevenLabs quota, and `/api/decide` trusts client-supplied `financial_context`
   and `transactions`, so "cited" numbers can be poisoned. No rate limiting exists on any route;
   no security headers are set in `next.config.js` or `vercel.json`.

5. **Peer benchmarks are entirely synthetic** — authored percentile tables scaled per
   bracket/tier in `scripts/generate_data.py` (L191–216) — and the "transport" row is invented at
   runtime as 22% of the user's bills spend (`lib/benchmark/computeBenchmark.ts` L82–98). Nothing
   in the UI discloses this.

6. **The entire ML/stat layer is duplicated** in TypeScript (`lib/ml/`) and Python
   (`ml-service/`), switched by `ML_MODE` (`lib/ml/runInline.ts`), with no golden-file parity test.
   Divergence has already started (date handling, output formatting).

7. **The anti-hallucination pattern is real and works.** `app/api/decide/route.ts` forces a
   `canIAfford` tool call, feeds the result back, and optionally runs a critic-model self-verify
   pass; a deterministic fallback without a Groq key still calls the real function. This is the
   seed of the "not just a wrapper" answer.

8. **Integrity drift:** `persona-arjun` (intended "Balanced Spender") actually classifies as
   "Disciplined Saver" and tests don't cover it; the balance chart claims "last 3 months" while
   plotting everything and contains a dead "sample to ~1 point per week" comment
   (`components/PastPanel.tsx` L50, L182); CONTRACT-005 documents bracket labels that no longer
   match `data/benchmark.json`.

9. **All `NEXT_PUBLIC_FEATURE_*` env flags in `.env.example` are dead** — `lib/features.ts`
   hardcodes every flag; dark mode is stripped by `ThemeGuard`; three persona JSONs
   (`arjun_saver`, `maya_foodie`, `riya_social`) are orphaned on disk.

10. **Scalability ceiling is low but fixable:** every context read loads and decrypts the full
    transaction history (`lib/db/contextService.ts` L30–38), every chat message ships the full
    transaction array from the client, refresh tokens accumulate without pruning, deactivated
    sessions are never cleaned up.

## What is genuinely good (keep it)

- The **data spine** (`types/financialContext.ts`, CONTRACT-001): one typed object shared by all
  three faces, persisted per session — this is the correct foundation for the chatbot and for
  multi-surface consistency.
- **Tool-grounded LLM + critic self-verify** in the DECIDE route.
- **AES-256-GCM field encryption** with random IVs for transaction descriptions; raw CSV bytes
  never stored; JWT payload carries only `sub` + `sid`.
- **Refresh-token rotation with hashed storage** and revocation.
- **Contract/handout documentation culture** — unusually auditable provenance.
- **Dual-mode deploy** (inline math on Vercel-only, or external Python service) — this becomes the
  basis of the local-only privacy mode rather than a liability, once the duplication gets a parity
  test.

## Recommended sequence (detail in [12-roadmap-and-chatbot.md](12-roadmap-and-chatbot.md))

- **P0 — Security hardening:** auth + rate limits on AI endpoints, JWT verification in middleware,
  security headers, remove dev-fallback secrets paths, server-side context loading for DECIDE.
- **P1 — Trust & honesty:** real Google/Microsoft OAuth, remove fake provider stubs, label
  synthetic benchmarks, transaction correction flow with confidence scores, fix misleading chart
  labels, retention/consent surface.
- **P2 — Real intelligence:** trained transaction classifier, learned archetypes, seasonal
  forecasting, opt-in aggregated real benchmarks, single source of truth for the math layer.
- **P3 — Product surface:** UI redesign, mobile/PWA, general AI chatbot on the tool registry,
  local-AI (Ollama/LM Studio) hybrid mode.
