# 05 — Machine Learning Audit & AI Usage Audit

Covers assessment sections 6 (ML audit) and 7 (AI usage audit).

## The one-sentence truth

**There is no trained machine-learning model anywhere in this codebase** — every "model" is
either hand-authored rules, closed-form statistics, or an external LLM; the vocabulary
("classifier", "regressor", `ml-service/`, `numpy` in requirements) implies more learning than
exists.

---

## 6. ML audit — every "model", spec-sheet style

### 6.1 Archetype "classifier" — nearest centroid

| Attribute | Value |
|-----------|-------|
| Purpose | Assign one of 5 spending archetypes |
| Inputs | `transactions[]` + `monthly_income` (`POST /classify`, `ml-service/main.py` L70–85) |
| Outputs | `{ label, distances }` — all 5 distances returned for the radar chart |
| Algorithm | 5-dim feature vector (food/shopping/bills/entertainment spend ÷ income; savings = residual `max(0, 1 − Σ others)`) → Euclidean distance to 5 fixed centroids → argmin (`ml-service/classify.py` L70–125) |
| Dataset | None. Centroids hand-authored with narrative justification (`ml-service/centroids.py` L13–33) |
| Training method | None — "hand-rolled distance calc… No ML library needed" (its own comments, `classify.py` L1–4) |
| Performance | Deterministic, O(n) per request |
| Accuracy | Unmeasured. Known failure: `persona-arjun` (intended Balanced Spender) classifies as Disciplined Saver — 0.1226 vs 0.1382 distance — and `ml-service/tests/test_ml.py` L34–35 only asserts 3 of 5 personas |
| Deployment | Dual: FastAPI on Render (`render.yaml`) and inline TS (`lib/ml/classify.ts`), switched by `ML_MODE` |
| Notes | Savings feature is residual income share, not actual savings transactions — the `buckets["savings"]` accumulator is computed and then unused; unmapped categories silently fold into shopping |

### 6.2 Burn-rate "regressor" — hand-rolled OLS

| Attribute | Value |
|-----------|-------|
| Purpose | Daily spend average, balance trend, projected zero-balance date |
| Inputs | `transactions[]` (`POST /burn-rate`) |
| Outputs | `{ daily_avg, trend_slope, projected_zero_balance_date }` |
| Algorithm | Signed running end-of-day balance for every day in the window → closed-form OLS slope `cov(t, balance)/var(t)` → linear projection to zero, capped at 3650 days (`ml-service/burn_rate.py` L26–97) |
| Dataset / training | None — descriptive fit on the submitted sample only |
| Accuracy | Explicitly disclaimed: "no forecasting-accuracy claim" (`burn_rate.py` L1–3, CONTRACT-003). No confidence interval computed |
| Deployment | Same dual TS/Python |
| Weaknesses | Linear-only (no seasonality, salary-cycle sawtooth biases the fit); assumes the transaction window starts at balance 0; sensitive to window length |

### 6.3 `can-i-afford` — hypothetical re-run

Baseline burn-rate → insert hypothetical expense dated on the last day → re-run → `day_shift` =
difference in projected zero dates; `affordable` = hypothetical zero date still in the future
(`ml-service/can_i_afford.py` L43–66). Verified by a hand-calculation script
(`scripts/verify_task007_can_i_afford.py`). Not ML; a good deterministic what-if.

### 6.4 CSV transaction categorizer — keyword rules

Regex table with 5 categories, unknowns → `shopping`, credits → `income`, zero confidence
tracking (`lib/csv/parseBankCsv.ts` L32–38, L119–124, L182–187). Not ML.

### 6.5 Benchmark "model" — static lookup + interpolation

Static synthetic percentile tables (5 brackets × 3 tiers × 5 categories, authored in
`scripts/generate_data.py` L191–216) with piecewise-linear percentile interpolation at runtime
(`lib/benchmark/computeBenchmark.ts` L29–47). Not ML; not real data.

### 6.6 Dependency note

`numpy==1.26.4` is declared (`ml-service/requirements.txt`) and never imported — all math is
pure Python. Remove it or start using it; as-is it signals an ML stack that isn't there.

---

## 6b. Recommended ML models (what to actually build)

Priority order by impact-per-effort:

1. **Transaction classifier (highest value).**
   - Inputs: cleaned narration + amount + day-of-month + recurrence features.
   - Model: multilingual sentence-embedding (e.g. a small model from the `sentence-transformers`
     family, runnable locally) + logistic regression head; upgrade path to a fine-tuned small
     transformer once labeled volume exists.
   - Data: bootstrap with the keyword rules as weak labels + public merchant lists; the user
     correction queue ([02](02-hackathon-feedback-responses.md) §2.5) becomes the gold set.
   - Output: probability distribution → `category`, `confidence`, `source` stored per
     transaction.
   - Metric: macro-F1 on a held-out labeled set; ship only above a threshold (e.g. 0.85), keep
     rules as the fallback layer.

2. **Recurring-payment / subscription detector.** Periodicity detection on (merchant token,
   amount) series — mostly deterministic signal processing, but the single most requested PFM
   feature and a prerequisite for good forecasting.

3. **Cashflow forecasting upgrade.** Replace linear OLS with seasonal decomposition (weekly +
   monthly salary cycle); candidates: STL + drift, or a small gradient-boosted model on
   calendar features. Emit prediction intervals — the UI confidence band comes from here.

4. **Learned archetypes.** Collect real user feature vectors → k-means (k via silhouette) →
   name/validate clusters → replace authored centroids; keep the same
   `{label, distances}` contract so the UI doesn't change. Add per-feature contribution for
   explainability.

5. **Anomaly detection (later).** Robust z-score or isolation forest on daily category spend
   for "unusual spend" alerts — powers the proactive-notification roadmap.

---

## 7. AI usage audit

### Where AI (LLM) is actually used

| Feature | Model | Why an LLM is needed | File |
|---------|-------|----------------------|------|
| DECIDE reply generation | Groq `llama-3.1-8b-instant` (env `GROQ_MODEL`) | Natural-language understanding of the question + narration of tool output | `app/api/decide/route.ts` L279–319 |
| DECIDE self-verify critic | `GROQ_CRITIC_MODEL` (same default) | Cross-check narration vs tool result; PASS/FAIL | `decide/route.ts` L210–238 |
| Exa price grounding | Exa search API (not an LLM, retrieval) | Live price hints for "can I afford X" items | `decide/route.ts` L185–208 |
| Voice narration | ElevenLabs TTS | Speech synthesis | `app/api/voice/narrate/route.ts` |
| Voice input | Browser Web Speech API (on-device/vendor STT) | Dictation | `components/DecideChat.tsx` L142–177 |

### Which tasks are deterministic (and must stay that way)

Affordability math, burn rate, archetype assignment, goal pace, benchmark percentiles, CSV
parsing/categorization. The product's core promise is precisely that these never come from the
LLM — the DECIDE route enforces it via forced tool-calling with a no-key deterministic fallback
(`fallbackDecide`).

### Which tasks genuinely require LLM reasoning

- Intent + entity extraction from free-form questions ("can I afford a 80k laptop next month?").
- Turning tool output into situated advice referencing the user's archetype/goal.
- (Future chatbot) multi-step tool orchestration and clarification dialogs.
- (Future) low-confidence transaction classification assist (batched, cached, constrained
  output) — an LLM *helper* inside an ML pipeline, not the pipeline.

### Clear taxonomy — AI vs ML vs rules vs statistics

| Layer | Definition | In FORE today | In FORE after upgrades |
|-------|-----------|----------------|------------------------|
| **Rules** | Hand-written deterministic logic | CSV keyword categorizer; category aliasing; income bracket/tier inference | Layer-1 of the classification pipeline; user-defined rules |
| **Statistics** | Closed-form math on the sample | OLS burn rate; percentile interpolation; nearest-centroid distance | Same + prediction intervals, seasonality decomposition |
| **Machine learning** | Parameters fitted to data | **None** | Trained transaction classifier; learned archetype clusters; forecasting model; anomaly detector |
| **AI (LLM)** | Foundation-model reasoning | Groq narration + critic in DECIDE only | Chatbot orchestration; classification assist; always tool-grounded |

### Honesty actions

1. Stop calling the centroid matcher and OLS "ML" in user-facing and pitch material until a
   trained model ships; "verified deterministic math" is actually the stronger claim.
2. Remove unused `numpy` (or adopt it when the real models land).
3. Add the missing two personas to `ACTIVE_PERSONAS` in tests and fix or re-tune
   `persona-arjun` — a "classifier" that mislabels its own demo data is a stage risk.
4. Add a TS↔Python golden-file parity test so the dual implementations can't drift
   (see [10-codebase-audit.md](10-codebase-audit.md)).
