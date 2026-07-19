# 02 — Hackathon Feedback & Criticism Analysis

Every criticism received, answered honestly against the actual code, with the technical
improvement that neutralizes it.

---

## 2.1 "It's just another AI wrapper"

**Why it appears that way.** The visible AI is a Groq/Llama chat box. The archetypes, burn
rate, and benchmarks all *look* like LLM output but are deterministic math — and because the
UI doesn't explain the machinery, the audience assumes the cheapest explanation: prompt → LLM →
answer.

**What is actually different today.** The DECIDE route inverts the usual wrapper pattern: the
LLM is *forbidden* from producing financial numbers. `app/api/decide/route.ts` forces a
`canIAfford` tool call, computes the answer with real math on the user's transactions, feeds
the result back, and then has the model narrate it. A second critic-model pass
(`selfVerifyReply`) checks the narration against the tool output and appends a disclaimer on
failure. Even with no API key at all, `fallbackDecide` still calls the real function — the
numbers never come from the model. Most wrappers do the opposite: they trust the model and hope.

**What original technology exists.**

- The `financial_context` data spine (CONTRACT-001, `types/financialContext.ts`): every face
  reads and writes one typed object, so PAST, DECIDE, and AHEAD can never disagree.
- The tool-grounding + self-verify loop.
- Dual-runtime math (`lib/ml/` TS and `ml-service/` Python) selectable at deploy time.

**What proprietary intelligence exists.** Honestly: little, yet. Centroids are authored, not
learned; benchmarks are synthetic. The proprietary layer must be *built*, and the plan is:

1. A trained transaction classifier for Indian bank narrations (the labeled corrections users
   make become the training set — a data moat competitors can't copy).
2. Learned archetypes (clustering on real user feature vectors, replacing authored centroids).
3. Real, opt-in aggregated benchmarks (replacing the synthetic percentile tables).
4. Seasonal/regime-aware forecasting replacing linear OLS.

**What makes it genuinely unique after that:** a verified-math financial reasoning engine where
every number is traceable to a deterministic function over the user's own data, with the LLM as
interface, not oracle.

---

## 2.2 "How is this different from ChatGPT?"

Four concrete answers:

1. **ChatGPT guesses; FORE computes.** Ask ChatGPT "can I afford a ₹80k laptop?" and it will
   produce plausible arithmetic on numbers you typed. FORE runs `canIAfford()` on your actual
   transaction history and reports the shift in your projected zero-balance date
   (`ml-service/can_i_afford.py`). The model cannot fabricate the answer — the tool result is
   injected and a critic verifies the narration.
2. **Persistent, structured state.** ChatGPT has chat memory; FORE has a typed financial spine
   persisted per session (`prisma/schema.prisma` `FinancialSession`) that every surface —
   archetype, runway, goals, benchmarks, chat verdicts — reads and writes. A DECIDE verdict
   immediately moves the AHEAD goal pace.
3. **Domain workflow, not prompting.** Upload statement → parse → classify → project → decide is
   a pipeline. Users don't engineer prompts; the product engineers the context.
4. **Privacy posture ChatGPT can't offer.** Only the spine summary (income, burn rate, archetype,
   goal) reaches the LLM — transaction rows and bank narrations are never sent to Groq (verified
   in `app/api/decide/route.ts` L29–45; note `docs/SECURITY.md` overstates this in the opposite
   direction and should be corrected). With the local-mode roadmap
   ([08-local-ai-hybrid.md](08-local-ai-hybrid.md)), even the summary can stay on-device.

**Product differentiation to build:** proactive intelligence (alerts when the runway shortens,
subscriptions creep, spend regime changes) — ChatGPT is pull-only; a finance product must push.

---

## 2.3 "Why should I trust my financial data with AI?"

**Current state (verified in code):**

| Claim | Reality |
|-------|---------|
| Encryption at rest | Transaction descriptions AES-256-GCM with random 12-byte IV per field (`lib/security/encryption.ts`). Amounts, dates, categories are plaintext (needed for queries) |
| Raw statement retention | Raw CSV bytes are parsed in memory and never stored (`app/api/upload/csv/route.ts`) |
| What the LLM sees | Spine summary only — no transaction rows, no narrations (`app/api/decide/route.ts` L29–45) |
| Transport | HTTPS everywhere; Groq called server-side only; key never reaches the client |
| Session security | httpOnly, Secure (prod), SameSite=Lax cookies; JWT carries only `sub`+`sid`; refresh tokens hashed + rotated |
| Data ownership | User delete cascades through sessions and transactions (Prisma `onDelete: Cascade`) |

**Current gaps (also verified):** unauthenticated AI endpoints, no rate limiting, no consent
screen, no retention policy, demo-mode data in `localStorage`, dev fallback secrets
(`lib/auth/jwt.ts` L17, `lib/security/encryption.ts` L20 — production throws, dev does not).

**Security & privacy roadmap:**

1. **P0:** authenticate `/api/decide`, `/api/ml/*`, `/api/voice/narrate`; rate limits; security
   headers; verify JWT in middleware.
2. **Consent & transparency:** first-run consent screen enumerating exactly what leaves the
   device; a "what the AI can see" panel; per-feature toggles.
3. **Local-only mode:** all math already runs inline in the Next.js process; add Ollama/LM Studio
   for the chat layer and nothing leaves the machine ([08-local-ai-hybrid.md](08-local-ai-hybrid.md)).
4. **Data ownership:** export-all (JSON/CSV) and delete-account endpoints; retention windows.
5. **Compliance track:** India DPDP Act 2023 alignment (consent, purpose limitation, erasure);
   if pursuing bank connections, the RBI Account Aggregator framework is the compliant path —
   it never exposes credentials and is consent-scoped by design.

---

## 2.4 "CRED / Google Pay / PhonePe / bank apps already do this"

**Overlap (they do it, often better):** transaction feeds, automatic categorization, monthly
spend summaries, bill reminders, credit-score surfaces, rewards.

**What they don't do (FORE's actual wedge):**

- **Forward projection:** none of them answer "when do I hit zero at this pace?" — FORE's
  burn-rate + zero-balance date is a forward-looking primitive, not a report.
- **Decision simulation:** "if I buy this, my runway moves by N days" (`day_shift`) is a
  what-if engine; payments apps have no counterfactual layer.
- **Conversational reasoning over your own numbers** with verified math.
- **Behavioural identity:** archetypes as an explainable spending personality (once learned from
  real data rather than authored).
- **Neutrality:** payment apps monetize transactions and rewards; their incentive is more
  spending. A foresight tool's incentive can be aligned with the user.

**Missing differentiators to close:** automatic data ingestion (today's CSV upload is friction;
CRED/GPay sit in the payment flow — the Account Aggregator framework or SMS parsing on Android
is the answer), proactive alerts, and recurring-payment/subscription detection.

**New opportunities they structurally can't chase:** local/private mode (their business model
requires the data server-side), and an open "verified math" audit trail per answer.

---

## 2.5 "How does the system classify undefined payments?"

**Honest current answer.** A keyword rule engine, and nothing else:

- `CATEGORY_KEYWORDS` regex table (`lib/csv/parseBankCsv.ts` L32–38): Swiggy/Zomato→food,
  Amazon/Flipkart→shopping, Netflix/Spotify→entertainment, SIP/mutual fund→savings,
  rent/EMI/recharge→bills.
- Credits become `income` (any positive amount — the salary-regex branch is redundant,
  L182–187).
- **Anything unmatched defaults silently to `shopping`** (L123). No confidence score, no
  "uncategorized" state, no user correction, no learning.
- Downstream, `ml-service/classify.py` re-aliases labels into the 5 buckets and again defaults
  unknowns to shopping.

**Target pipeline (the fix):**

1. **Preprocessing:** normalize narration (strip UPI/NEFT/IMPS reference noise, merchant-token
   extraction), dedupe, detect recurring patterns.
2. **Layer 1 — deterministic rules:** exact merchant matches and user-defined rules; confidence
   1.0.
3. **Layer 2 — ML classifier:** sentence-embedding of the cleaned narration + logistic
   regression / small fine-tuned transformer trained on labeled Indian bank narrations;
   outputs a probability distribution over categories.
4. **Layer 3 — LLM assist (optional, batched):** only for rows below the confidence threshold,
   classify with a constrained-output prompt; cache results per merchant token.
5. **Confidence scoring:** every transaction stores `category`, `confidence`, `source`
   (rule/ml/llm/user) — schema change to the `Transaction` model.
6. **Manual correction flow:** low-confidence rows surface in a "needs review" queue; a user
   correction becomes a permanent personal rule *and* a labeled training example — the
   feedback loop that turns usage into a data moat.

---

## 2.6 Domain (category) breakdown — how it's generated

- **Demo personas:** categories assigned at generation time by `scripts/generate_data.py` —
  there is no runtime classification for demo data.
- **CSV uploads:** the keyword engine above.
- **Feature vector for archetypes:** `ml-service/classify.py` L70–105 buckets spend into
  food/shopping/bills/entertainment, averages monthly, divides by income; **savings is the
  residual** `max(0, 1 − sum(other four))`, not the ledger's savings transactions.
- **ML models used: none.** **AI assistance: none.** **Category confidence: none.**
- Upgrade path is §2.5's pipeline plus per-category confidence surfaced in the UI (e.g. a
  "92% confident" chip with a one-tap correction).

---

## 2.7 Target audience

- **Primary:** urban Indian salaried professionals, 22–35, first 3–10 years of earning — digital
  banking users with UPI-heavy statements, no CA/financial advisor, who feel "money disappears".
  The persona set (Priya/Rahul/Aisha/Riya/Arjun, ₹25k–₹100k+ brackets, Tier 1–3 cities) already
  encodes exactly this segment.
- **Secondary:** students managing allowances; freelancers/gig workers with irregular income
  (note: the current linear burn model is weakest exactly here — a real forecasting model is a
  prerequisite for this segment); young couples planning joint goals.
- **Market segment:** consumer PFM (personal financial management), India-first, positioned
  between payment apps (data-rich, insight-poor) and wealth platforms (investment-only).
- **Problem statement:** people see *where* money went but get no help with *what happens next*
  or *what a decision does to their future*.
- **Product-market fit test:** retention on the "runway" number and correction-queue engagement —
  if users keep their statements flowing in to keep the projection alive, the wedge is real.

---

## 2.8 Archetype assignment — how it works

- **Variables considered:** exactly five ratios of monthly income — food, shopping, bills,
  entertainment share of spend, plus residual savings share (`ml-service/centroids.py` L6–11).
- **Method:** Euclidean distance to 5 fixed, hand-authored centroids; label = argmin
  (`ml-service/classify.py` L108–125). Deterministic; no randomness; ties break by insertion
  order.
- **Behaviour analysis:** monthly averaging over the transaction window
  (months = `max(window_days / 30.44, 1)`).
- **ML model: none** — the centroids were written by the team with narrative justification
  (e.g. Foodie = 38% food), not fitted to data. One shipped persona (`persona-arjun`)
  contradicts its own intended label, which is what happens without a fitting stage.
- **AI reasoning: none** in assignment. The LLM only *mentions* the archetype because it's in
  the spine.
- **Explainability:** good bones — all five distances are returned and rendered as the radar
  chart. What's missing: "you are a Foodie *because* food is 34% of spend vs 20% for peers"
  (per-feature contribution to the distance), which is trivial to compute from the same vector.
- **Upgrade:** collect real user vectors → k-means (k chosen by silhouette) → name and validate
  clusters → per-feature contribution explanations. Until then, the honest framing is
  "rule-based profile matching", not ML.

---

## 2.9 "How many months of data are required?"

Grounded in the actual math (all windows derived from min/max transaction dates):

| Data | What you get | Caveats |
|------|--------------|---------|
| **Minimum usable: ~1 month (≥ ~30 txns)** | Category breakdown, rough burn rate, an archetype guess | OLS slope on <30 days is noise-dominated; single salary cycle; the CSV parser already warns below 10 parsed rows (`parseBankCsv.ts` L199–201) |
| **Recommended: 3 months** | Stable monthly averages, meaningful runway, credible archetype | This is what the synthetic personas model (3 months, ~117 txns); benchmark math hardcodes `BENCH_MONTHS = 3` (`computeBenchmark.ts` L27) |
| **Ideal: 6–12 months** | Seasonality (festivals, annual fees), recurring-payment detection, income-variability handling | Requires the forecasting upgrade — linear OLS cannot use seasonality |

**Confidence over time:** today nothing changes with more data except window length — no
confidence is computed anywhere. The upgrade: surface a confidence band on the zero-balance
date (residual variance of the OLS fit gives this almost for free), tighten archetype confidence
as monthly vectors stabilize, and label projections "low confidence" under 60 days of data.

---

## 2.10 Data spine — complete architecture

**The concept (CONTRACT-001):** one typed `FinancialContext` object is the only way faces
exchange data. Rule: *no face shows a number without writing it back to the spine first.*

**Shape** (`types/financialContext.ts`): `session_id`, `persona`, `monthly_income`,
`archetype {label, distances} | null`, `burn_rate {daily_avg, trend_slope,
projected_zero_balance_date} | null`, `transactions[]`, `goal | null`,
`last_decide_verdict {item, amount, day_shift, new_zero_balance_date} | null`,
`benchmark[] | null`.

**Storage:**

- Demo mode: React state in `FinancialContextProvider` + `localStorage` key
  `fore_financial_context_v1`.
- Full-stack: `FinancialSession` row (Prisma) with ML outputs as JSON columns
  (`archetypeDistances`, `burnRate`, `benchmark`, `goal`, `lastDecideVerdict`) + child
  `Transaction` rows (`sessionId` FK, `[sessionId, date]` index, encrypted `descriptionEnc`).

**Schema** (`prisma/schema.prisma`): `User` → `RefreshToken[]` + `FinancialSession[]` →
`Transaction[]`, cascade deletes; one active session per user enforced by
`createSessionFromTransactions` deactivating the rest.

**Honest gaps vs the questions asked:**

- **Dataset versioning: none.** Each upload creates a new session; old sessions are deactivated
  but never compared, merged, or migrated. The `_v1` suffix on the localStorage key is the only
  versioning in the system.
- **Data stacking: none.** A new CSV replaces the active session rather than appending to a
  continuous ledger. The upgrade is a per-user ledger with statement-level provenance and
  dedupe, sessions becoming *views* over it.
- **Data lineage: partial.** `dataSource` (`demo`/`csv`) and `csvFileName` are recorded per
  session; per-transaction lineage (which file, which row, which classifier version) is not.
- **Contract versioning:** append-only contract docs with breaking-change re-issue, no semver.

---

## 2.11 User accounts

- **Lifecycle:** register (`/api/auth/register`, zod-validated, bcrypt-12) → optional persona
  seed → login → access JWT (15 min) + refresh (7 days, hashed, rotated on `/api/auth/refresh`)
  → logout revokes refresh + clears cookies. Client refresh loop every 10 min
  (`lib/auth/refreshClient.ts`).
- **Session handling:** JWT carries `sub` (userId) + `sid` (active financial session);
  `requireAuth` re-validates the session row (`id`, `userId`, `isActive`) on protected routes
  (`lib/auth/session.ts`).
- **Database mapping:** `User` 1—N `FinancialSession` 1—N `Transaction`; `RefreshToken` per
  device login.
- **Multi-user isolation:** writes are userId-scoped (`patchSessionContext`,
  `createSessionFromTransactions`); **gap:** `sessionToContext` looks up by `sessionId` alone
  (`lib/db/contextService.ts` L30–34) and `/api/auth/me` doesn't re-bind `sid` to `sub` — low
  exploitability (requires a signed token), but a defense-in-depth hole to close.
- Full replacement plan (OAuth, hardening): [04-authentication-upgrade.md](04-authentication-upgrade.md).

---

## 2.12 Security audit (full)

| Area | Finding | Severity | Evidence |
|------|---------|:--------:|----------|
| Authentication | Solid email/JWT core; but `/api/decide`, `/api/ml/*`, `/api/voice/narrate` fully unauthenticated | **High** | route files; `middleware.ts` L16–22 |
| Authentication | Provider sign-in = shared demo accounts, hardcoded password in source | **High** (if mistaken for real) | `app/api/auth/demo/route.ts` L21–29 |
| Authorization | `sessionToContext` not userId-scoped; `/api/auth/me` skips session ownership check | Medium | `lib/db/contextService.ts` L31–34; `app/api/auth/me/route.ts` |
| Encryption | AES-256-GCM correct (random IV, auth tag); amounts/categories plaintext; fixed scrypt salt `fore-salt-v1` for passphrase keys | Low–Medium | `lib/security/encryption.ts` |
| Secrets | Dev fallbacks for JWT secret and encryption key (prod throws); demo guest password in source | Medium | `lib/auth/jwt.ts` L13–19; `encryption.ts` L17–21 |
| API security | No rate limiting anywhere; expensive third-party calls (Groq/ElevenLabs) reachable anonymously — cost DoS | **High** | all routes |
| API security | `/api/decide` trusts client-supplied `financial_context` + `transactions` → poisoned "verified" numbers | **High** | `app/api/decide/route.ts` L244–249 |
| SQL injection | Low risk — all DB access through Prisma parameterized queries | OK | all `lib/db/` |
| XSS | React escaping covers output; API error strings echoed into chat UI; demo-mode financial data in `localStorage` readable by any XSS | Medium | `components/DecideChat.tsx` L104; `lib/storage/contextStorage.ts` |
| CSRF | No tokens; relies solely on `SameSite=Lax` httpOnly cookies — acceptable minimum, add origin checks on state-changing routes | Medium | `lib/auth/jwt.ts` L56–63 |
| Rate limiting | None | **High** | — |
| Secure headers | None set (no CSP, HSTS, X-Frame-Options, Referrer-Policy) | Medium | `next.config.js`, `vercel.json` |
| Middleware | Checks cookie *presence* only, never verifies the JWT; real checks live in route handlers | Medium | `middleware.ts` L24–34 |
| File upload | 5 MB cap, but no MIME/extension check and no row-count cap | Medium | `app/api/upload/csv/route.ts` L12, L37–38 |
| Timing | Login skips bcrypt when the user doesn't exist — email-existence timing oracle | Low | `app/api/auth/login/route.ts` L36–38 |
| Info leaks | Upstream Groq/ElevenLabs/ML error messages returned to clients | Low | `decide/route.ts` L335–336; `narrate/route.ts` L36–49 |
| ML service | No auth between Next.js and Render service; CORS allowlist is the only control | Medium | `ml-service/main.py` L20–36 |
| Privacy | No consent flow, no retention policy (acknowledged in `docs/SECURITY.md`); `SECURITY.md` claims descriptions are sent to Groq — code does not; fix the doc | Medium | `docs/SECURITY.md` |

Remediation order and effort are folded into the P0/P1 phases of
[12-roadmap-and-chatbot.md](12-roadmap-and-chatbot.md).
