# 10 — Codebase Audit

Full defect and tech-debt inventory, prioritized. Baseline is good: strict TypeScript,
zod on most auth inputs, small modules, 28 passing Python tests, contract docs. The issues
below are ranked P1 (fix first) → P3 (cleanup).

## P1 — Correctness & security-adjacent

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| 1 | **TS↔Python ML duplication with no parity test.** Centroids, classify, burn-rate, canIAfford each exist twice; drift has started (Python skips bad dates, TS `parseDate` can produce NaN; `₹{:,.0f}` vs `toLocaleString("en-IN")` explanation strings; JS UTC vs Python `date` edge cases) | `lib/ml/*` vs `ml-service/*` | Silent divergence between deploy modes — the demo and Render answers can disagree |
| 2 | **Unauthenticated expensive endpoints** | `/api/decide`, `/api/ml/*`, `/api/voice/narrate` | Cost DoS + data poisoning (details in [02](02-hackathon-feedback-responses.md) §2.12) |
| 3 | **`PATCH /api/context` accepts unvalidated JSON** — cast without zod, written into Prisma Json columns | `app/api/context/route.ts` L39–50 | Garbage in the spine; every face renders from it |
| 4 | **No rollback when analytics fail during session creation** — session + transactions insert, then `computeAndPersistPast` can throw, leaving a half-initialized active session | `lib/db/contextService.ts` L114–138 | Users land on a broken PAST with no recovery path |
| 5 | **`sessionToContext` not userId-scoped; `/api/auth/me` skips session ownership** | `lib/db/contextService.ts` L30–34; `app/api/auth/me/route.ts` | Defense-in-depth hole |
| 6 | **DECIDE trusts client-supplied transactions + context** instead of loading by authenticated session | `app/api/decide/route.ts` L244–249; `components/DecideChat.tsx` L83–85 | Poisoned "verified" numbers; also ships the full transaction array over the wire per message |
| 7 | **Provider sign-in navigates to the app even when auth fails** | `app/login/page.tsx` L139–143 | User appears logged in while unauthenticated |

## P2 — Bugs & misleading behavior

| # | Finding | Location |
|---|---------|----------|
| 8 | Balance chart: dead "weekly sampling" comment + false "last 3 months" caption | `components/PastPanel.tsx` L50, L182 |
| 9 | `persona-arjun` misclassifies vs its intended archetype; tests cover only 3/5 personas | `data/personas/persona-arjun.json`; `ml-service/tests/test_ml.py` L34–35 |
| 10 | Register has no demo-mode fallback (login soft-passes on 503, register hard-fails); hardcodes `monthlyIncome: 60000` on the non-persona path | `app/register/page.tsx` L30 |
| 11 | Redundant/confusing income classification branch — the salary regex is dead because *any* positive amount already maps to income | `lib/csv/parseBankCsv.ts` L182–187 |
| 12 | Amount sign convention contradicts its own type comment ("positive = outflow" in `types/financialContext.ts` L24 vs signed convention used everywhere) | `types/financialContext.ts` |
| 13 | Currency labels hardcode "₹" while the toolbar can select USD/EUR; FX rates are static constants | `components/GoalPanel.tsx` L86, `CsvUploadPanel.tsx` L134; `lib/format/currency.ts` |
| 14 | Login timing oracle (bcrypt skipped for unknown emails) | `app/api/auth/login/route.ts` L36–38 |
| 15 | Upstream error text (Groq/ElevenLabs/ML) relayed to clients and rendered in chat | `decide/route.ts` L335–336; `narrate/route.ts` L36–49; `DecideChat.tsx` L104 |
| 16 | CONTRACT-005 bracket labels drifted from `data/benchmark.json` / generator | `docs/CONTRACTS.md` L107–110 vs `scripts/generate_data.py` L187–188 |
| 17 | `docs/SECURITY.md` claims descriptions are decrypted for Groq; the code never sends them — fix the doc (in the safe direction) | `docs/SECURITY.md` L58–59 |

## P2 — Performance & efficiency

| # | Finding | Location |
|---|---------|----------|
| 18 | Every context read loads + decrypts the **entire** transaction history; no pagination anywhere | `lib/db/contextService.ts` L30–38 |
| 19 | `FinancialContextProvider` wraps the whole app; any `ctx` change re-renders all consumers; ~117 transactions held in state + serialized to localStorage on each change | `lib/context/FinancialContextProvider.tsx` |
| 20 | Refresh loop fires immediately on mount and every 10 min regardless of token freshness | `lib/auth/refreshClient.ts` L24–26 |
| 21 | Refresh tokens accumulate (revoked, never pruned; new login doesn't revoke old); deactivated sessions never cleaned | `app/api/auth/login/route.ts`, `refresh/route.ts` |
| 22 | Balance series renders one Recharts point per transaction | `components/PastPanel.tsx` L46–57 |
| 23 | ML service: sync handlers, single process, O(n) per request, no cache — fine now, a ceiling later (see [11](11-scalability.md)) | `ml-service/main.py` |

## P3 — Dead code, duplication, hygiene

| # | Finding | Location |
|---|---------|----------|
| 24 | All 13 `NEXT_PUBLIC_FEATURE_*` env flags documented but never read; `lib/features.ts` hardcodes them | `.env.example` L22–34; `lib/features.ts` |
| 25 | Unused import `FaceIntro` | `app/(faces)/past/page.tsx` L1 |
| 26 | Unused import `verifyAccessToken` | `app/api/auth/refresh/route.ts` L10 |
| 27 | Orphan persona JSONs from the legacy generator (different schema: positive amounts, no income rows) | `data/personas/{arjun_saver,maya_foodie,riya_social}.json`; `scripts/generate_task004_data.py` |
| 28 | `numpy` declared, never imported | `ml-service/requirements.txt` |
| 29 | `/api/auth/refresh` DELETE duplicates `/api/auth/logout` | both route files |
| 30 | Duplicate `inr()` helpers wrapping `formatMoney`; FaceIntro copy strings repeated 4× across PastPanel branches | `PastPanel.tsx`, `GoalPanel.tsx` |
| 31 | `.benchmark-fill` class referenced with no CSS definition | `components/BenchmarkPanel.tsx` |
| 32 | Dark-palette PNG export vs light theme | `lib/export/aheadSummary.ts` L10–17 |
| 33 | `prose prose-invert` on the light theme | `app/docs/security/page.tsx` L5 |
| 34 | Chat messages keyed by index | `components/DecideChat.tsx` L194 |

## Build / TypeScript / CSS status

- **Build:** `npm run build` = `prisma generate && next build`; no known breakage; `postinstall`
  runs prisma generate (fails without network to registry only). Pinned Next 14.2.35, React
  18.3.1 — one major behind (Next 15/React 19) but stable; upgrade is a P3.
- **TypeScript:** `strict: true`; no `any` abuse found; local SpeechRecognition typings are
  pragmatic. Main TS risk is #1 (duplicated math) and #3 (unvalidated casts into Json columns).
- **CSS:** design system lives in `app/globals.css` `@layer components` with an empty Tailwind
  `extend` — consistent, though it bypasses Tailwind's theme where tokens could be shared;
  issues #31–33 above.
- **Memory leaks:** none found — event listeners and the refresh interval are cleaned up in
  effects; SpeechRecognition instances are per-invocation.
- **Async:** no unawaited-promise hazards found in routes; `Promise.all` used correctly for
  classify+burn; the one real async gap is #4 (no transactional boundary).

## Recommended fix order

1. (#2, #6) Auth + server-side context for AI endpoints — one change eliminates two P1s.
2. (#1) Golden-file parity test: fixture transactions → assert TS and Python produce identical
   classify/burn/afford outputs in CI; then decide the long-term single source (generate one
   from the other, or drop one runtime).
3. (#3, #4, #5) zod schema on PATCH, interactive transaction around session create, userId
   scoping.
4. (#8–#17) Behavior/honesty batch — mostly one-liners.
5. (#18–#23) Performance batch alongside the scalability work.
6. (#24–#34) Hygiene sweep — safe, mechanical.
