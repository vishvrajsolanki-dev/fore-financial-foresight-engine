# 01 — Current Project Status & Feature Inventory

Covers assessment sections 1 (current status) and 2 (feature inventory).

The app runs in two modes, and every status below depends on which mode is active:

- **Demo mode** (no `DATABASE_URL`): no auth, client-side `financial_context` in React state +
  `localStorage` (`lib/storage/contextStorage.ts`), synthetic personas, middleware is a no-op
  (`middleware.ts` L7–9).
- **Full-stack mode** (`DATABASE_URL` set): email+JWT auth, Postgres via Prisma, encrypted
  transaction descriptions, CSV persistence, middleware gates `/api/context*` and `/api/upload*`
  only.

---

## 1. Current status matrix

### Fully working

| Feature | Evidence |
|---------|----------|
| Archetype assignment (nearest-centroid math) | `ml-service/classify.py`, `lib/ml/classify.ts`; deterministic, returns all 5 distances |
| Burn-rate / zero-balance projection (OLS trend) | `ml-service/burn_rate.py`, `lib/ml/burnRate.ts` |
| `canIAfford` what-if math | `ml-service/can_i_afford.py`, `lib/ml/canIAfford.ts`; verified by `scripts/verify_task007_can_i_afford.py` |
| DECIDE chat with real tool-calling (Groq) | `app/api/decide/route.ts` — forced tool call, second completion with tool result, critic self-verify |
| DECIDE deterministic fallback (no Groq key) | `fallbackDecide` in `app/api/decide/route.ts` L129–160 — still calls the real function |
| Email/password auth (register, login, logout, refresh rotation) | `app/api/auth/*`, `lib/auth/jwt.ts`, `lib/auth/password.ts` — bcrypt 12 rounds, 15-min access JWT, 7-day hashed refresh with rotation |
| CSV parsing (HDFC/ICICI/SBI-style header aliases) | `lib/csv/parseBankCsv.ts` — debit/credit and single-amount formats, 3 date formats, quote-aware line parser |
| AES-256-GCM encryption of transaction descriptions at rest | `lib/security/encryption.ts` — random 12-byte IV, auth tag, base64 |
| Demo personas (5) + persona switcher | `lib/data/personas.ts`, `data/personas/persona-*.json`, `components/PersonaCompare.tsx` |
| AHEAD goal pace calculator | `components/GoalPanel.tsx`, `lib/ahead/insights.ts` — computed from real burn/income in context |
| Peer benchmark percentile UI | `components/BenchmarkPanel.tsx` + `lib/benchmark/computeBenchmark.ts` (math real; data synthetic — see below) |
| Voice input (Web Speech API) | `components/DecideChat.tsx` L142–177 |
| Export AHEAD summary as PNG | `lib/export/aheadSummary.ts` (canvas; still uses the old dark palette) |
| Loading skeletons, empty states, route-level `loading.tsx` | `components/LoadingSkeleton.tsx`, `app/(faces)/*/loading.tsx` |
| ML service test suite | `ml-service/tests/` — 28 tests pass |

### Partially working

| Feature | What works | What doesn't |
|---------|-----------|--------------|
| Full-stack persistence | Sessions + transactions persist, context hydrates from `/api/auth/me` | If ML computation fails during session creation, the session is left without archetype/burn data — no rollback (`lib/db/contextService.ts` L114–138) |
| ElevenLabs voice narration | Client → `/api/voice/narrate` → ElevenLabs wired end-to-end | Dormant without `ELEVENLABS_API_KEY` (returns 503, client swallows it); endpoint unauthenticated |
| Exa price grounding | `exaPriceHint` in `app/api/decide/route.ts` L185–208 appends live price hints to the system prompt | Dormant without `EXA_API_KEY`; `exa_used` never surfaced in UI |
| Multi-currency | Display conversion with static rates (`lib/format/currency.ts`) | Hardcoded rates; form labels still say "₹" in `GoalPanel`/`CsvUploadPanel` regardless of selection |
| Register flow | Works with DB | Unlike login, has no demo-mode fallback: hard-fails with 503 when no DB; non-persona path hardcodes `monthlyIncome: 60000` (`app/register/page.tsx` L30) |

### Broken / misleading

| Feature | Problem |
|---------|---------|
| Balance chart labeling | Says "last 3 months" but plots all transactions; comment claims weekly sampling that doesn't exist (`components/PastPanel.tsx` L50, L182) |
| `persona-arjun` archetype | Intended "Balanced Spender", actually classifies "Disciplined Saver"; tests only cover 3 of 5 personas (`ml-service/tests/test_ml.py` L34–35) |
| Provider sign-in failure handling | `app/login/page.tsx` L139–143 navigates to the app even when auth failed — user appears logged in when they are not |
| CONTRACT-005 doc drift | `docs/CONTRACTS.md` documents `Under ₹30k` / `Tier-1` labels; `data/benchmark.json` uses `0-25k`…`100k+` / `Tier 1` |

### Placeholders / stubs

| Feature | Reality |
|---------|---------|
| Google / Microsoft / GitHub sign-in | Demo stubs — shared guest accounts `demo-{provider}@fore.app`, password hardcoded in `app/api/auth/demo/route.ts` L21. No OAuth round-trip exists anywhere. Explicitly documented as stubs in `app/login/page.tsx` L7–8 |
| Dark mode | Removed; `components/ThemeGuard.tsx` actively strips `data-theme` and the `fore_theme` key. No toggle exists |
| `/docs/security` page | Static bullets pointing at `docs/SECURITY.md`; uses `prose-invert` on the light theme |

### Mocked / fake data

| Feature | Reality |
|---------|---------|
| Peer benchmarks | Entirely synthetic — authored `BASE_PERCENTILES` scaled by bracket/tier in `scripts/generate_data.py` L191–216. Not survey or user data |
| Transport benchmark row | Invented at runtime as 22% of the user's bills spend with scaled percentiles (`lib/benchmark/computeBenchmark.ts` L82–98) |
| Personas | Seed-controlled synthetic generators (`scripts/generate_data.py`), ~115–123 transactions each over 3 months |

### Not implemented

- Real OAuth (Google/Microsoft) — see [04-authentication-upgrade.md](04-authentication-upgrade.md)
- Any trained ML model (see [05-ai-ml-audit.md](05-ai-ml-audit.md))
- Rate limiting (no route has any)
- Security headers (none in `next.config.js` or `vercel.json`)
- CSRF tokens (mitigated only by `SameSite=Lax`)
- Pagination on any API
- Data retention / deletion policy (acknowledged in `docs/SECURITY.md` compliance notes)
- Transaction correction / recategorization UI
- Account aggregator or bank API integration (documented Tier 3 cut in `docs/ROADMAP.md`)
- Mobile navigation, PWA manifest, service worker
- `NEXT_PUBLIC_FEATURE_*` env wiring — `.env.example` documents 13 flags; `lib/features.ts` hardcodes all of them; nothing reads the env vars

### Exists only in UI (no backend behind it)

- Provider sign-in buttons (above)
- Currency selector (display-only conversion; nothing persisted, math stays INR)
- "checked your numbers" badge in DECIDE — real when the tool ran, but rendered from the API
  response flag, with no user-visible way to inspect the underlying math

---

## 1b. Which APIs are connected

| Integration | Status |
|-------------|--------|
| Groq (Llama 3.1) | Connected when `GROQ_API_KEY` set; `groq-sdk` in `app/api/decide/route.ts`; deterministic fallback otherwise |
| ElevenLabs TTS | Connected when `ELEVENLABS_API_KEY` set (`app/api/voice/narrate/route.ts`); otherwise 503 |
| Exa search | Connected when `EXA_API_KEY` set (`app/api/decide/route.ts` L185–208); otherwise skipped |
| Render ML service | Called when `RENDER_ML_BASE_URL` set / `ML_MODE=render`; otherwise inline TS math (`lib/ml/runInline.ts`) |
| PostgreSQL (Prisma) | Connected when `DATABASE_URL` set; otherwise demo mode |
| Plaid / bank APIs / UPI | Not integrated (explicit Tier 3 cut) |

## 1c. Which ML models are actually running

**None, in the trained-model sense.** What runs is:

- Nearest-centroid matching against 5 hand-authored centroids (deterministic, no fitting stage).
- Closed-form OLS slope on a running-balance series (descriptive statistics).
- Keyword regex categorization of CSV rows.

Full detail and recommendations in [05-ai-ml-audit.md](05-ai-ml-audit.md).

## 1d. Which AI features are actually functional

| AI feature | Functional? |
|------------|-------------|
| DECIDE chat with forced tool-calling | Yes (with Groq key); honest fallback without |
| Critic-model self-verify of replies | Yes (`selfVerifyReply`, `app/api/decide/route.ts` L210–238) — PASS/FAIL, appends disclaimer on FAIL |
| Exa live price grounding | Yes when keyed; off otherwise |
| Voice narration | Yes when keyed; off otherwise |
| Any AI in PAST or AHEAD | No — those faces are pure deterministic math + static data |

---

## 2. Feature inventory (per-feature detail)

Legend — **Status**: Working / Partial / Stub / Fake-data / Missing. **Prod-ready**: whether it
could ship to real users as-is.

| Feature | Purpose | Implementation | Status | Backend | DB | AI | ML | Prod-ready |
|---------|---------|----------------|--------|---------|----|----|----|------------|
| PAST — archetype card + radar | Show spending personality | `components/PastPanel.tsx` → `/api/ml/classify` → nearest-centroid | Working | Yes | Session JSON in full-stack | No | Centroid heuristic (not trained) | Demo-grade: centroids unvalidated |
| PAST — burn-rate stats + balance line | Runway / zero-balance projection | `PastPanel` → `/api/ml/burn-rate` → OLS | Working (mislabeled chart) | Yes | Session JSON | No | Statistics | Needs label fix + better model for irregular income |
| CSV upload | Ingest real bank statements | `components/CsvUploadPanel.tsx` → `/api/upload/csv` → `parseBankCsv` | Working | Yes | Transactions + encrypted descriptions | No | Keyword rules | Needs MIME check, confidence, correction flow |
| Transaction categorization | Assign categories | `CATEGORY_KEYWORDS` regex, default "shopping" | Working but crude | Yes | Category stored plaintext | No | Rules only | No — silent misclassification |
| DECIDE chat | "Can I afford X?" | `components/DecideChat.tsx` → `/api/decide` → Groq + `canIAfford` tool | Working | Yes | Verdict persisted via PATCH `/api/context` | Yes (Groq Llama 3.1) | Uses OLS what-if | Needs auth + server-side context + rate limits |
| Self-verify critic | Catch LLM math errors | Second Groq call, PASS/FAIL | Working | Yes | No | Yes | No | Reasonable pattern; needs logging/metrics |
| AHEAD goals | Goal pace vs burn | Client-side `computeGoal`; persisted in session | Working | Partial | Session JSON | No | No | Yes for simple goals |
| Peer benchmarks | Compare spend to peers | `computeBenchmark` vs static `data/benchmark.json` | Fake-data | No (static JSON) | Result cached on session | No | No | No — synthetic data undisclosed |
| Transport benchmark | Extra comparison row | Invented from bills × 0.22 | Fake-data | No | No | No | No | No — remove or disclose |
| Personas | Demo without real data | 5 synthetic JSONs, seeded generator | Working (by design) | No | Seeded into sessions | No | No | Fine as explicit demo |
| Email auth | Accounts | JWT + refresh rotation + bcrypt | Working | Yes | User/RefreshToken/Session models | No | No | Close — needs hardening (see 04) |
| Provider sign-in | OAuth | Shared demo guest accounts | Fake | Yes (demo route) | Shared users | No | No | No |
| Session persistence | Resume across devices | `FinancialSession` + `/api/auth/me` hydration | Working | Yes | Yes | No | No | Needs pagination + cleanup |
| Voice input | Dictate DECIDE questions | Web Speech API | Working | No | No | Browser STT | No | Yes (progressive enhancement) |
| Voice narration | Read replies aloud | ElevenLabs via `/api/voice/narrate` | Partial (key-gated) | Yes | No | Yes (TTS) | No | Needs auth + caching |
| Exa grounding | Live price hints | Exa API in decide route | Partial (key-gated) | Yes | No | Yes | No | Needs disclosure in UI |
| Multi-currency | Display in USD/EUR | Static rates, display-only | Partial | No | No | No | No | Cosmetic only |
| Export PNG | Share AHEAD summary | Canvas render | Working | No | No | No | No | Needs theme update |
| Dark mode | — | Actively removed by `ThemeGuard` | Stub | No | No | No | No | Decision needed |
| Security docs page | Trust surface | Static page | Working | No | No | No | No | Needs styling fix |
| Rate limiting, security headers, CSRF, retention, pagination, correction UI, mobile nav, PWA | — | — | Missing | — | — | — | — | — |
