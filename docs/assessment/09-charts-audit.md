# 09 — Charts & Visualizations Audit

## Inventory — every visualization in the app

Only `components/PastPanel.tsx` uses Recharts (`recharts@2.12.7` pinned); `BenchmarkPanel`
draws CSS bars; the AHEAD export renders to a raw canvas. That's the entire visualization
surface — three chart-like things plus stat tiles.

### 1. Radar chart — archetype closeness (`PastPanel.tsx` L38–44, ~L130–160)

- **Data:** real — the 5 distances returned by `/classify`, transformed client-side to
  `closeness = 1 / (1 + distance)`.
- **Verdict: honest but under-explained.** The inversion is a made-up scale (documented only in
  a caption); nothing tells the user *why* they're close to an archetype.
- **Issues:** long two-line angle labels clip at mobile widths; no text alternative for
  screen readers; the "closeness" number is unitless and unexplainable to a user.
- **Fix:** keep as a supporting visual; add per-feature contribution ("food 34% vs 20%
  centroid") as the primary explanation; shorten labels on small screens; add `role="img"` +
  generated summary text.

### 2. Line chart — running balance (`PastPanel.tsx` L46–57, ~L180–195)

- **Data:** real — cumulative sum of every transaction in context.
- **Verdict: misleading as labeled.** Two concrete lies:
  1. Caption says **"last 3 months"** (L182) while the series plots *all* transactions in
     context, whatever their span.
  2. The code comment claims *"Sample to ~1 point per week to keep the line readable"* (L50)
     but no sampling exists — every transaction becomes a point (~117 for personas), which is
     exactly why it's dense.
- Additional issues: running balance starts from 0 (correct only when the first row is an
  opening balance credit — true for generated personas, not guaranteed for CSVs); Y-axis
  `${v/1000}k` formatting is wrong for small balances; no zero-line reference even though the
  entire product narrative is "when do you hit zero".
- **Fix:** actually bucket weekly (or daily with a max-points cap); label with the real date
  range; draw a zero reference line and the projected zero-balance date marker (connects the
  chart to the hero stat); handle unknown opening balance explicitly ("relative balance"
  labeling).

### 3. Benchmark bars — CSS percentile bars (`BenchmarkPanel.tsx` L55–63)

- **Data:** user values are real (monthly spend by category ÷ hardcoded 3 months); percentiles
  are interpolated against **synthetic** authored tables; the **transport row is invented**
  (22% of bills spend vs percentiles scaled 15–25% from the bills row —
  `lib/benchmark/computeBenchmark.ts` L82–98).
- **Verdict: partly fake and undisclosed** — the most misleading visualization in the app.
- **Fix:** delete the transport row (or derive it from real transport-keyword transactions);
  label the panel "vs modeled peer data" until real aggregates exist; fix the 3-month
  assumption to use the actual data window.

### 4. AHEAD PNG export (`lib/export/aheadSummary.ts`)

- Canvas-rendered summary card using the **old dark navy palette** (L10–17) — visually
  incompatible with the shipped Warm Ledger theme. Fix palette; consider rendering from a DOM
  node (`html-to-image`) so it always matches the live theme.

### 5. Stat tiles (burn daily average, slope, zero date; goal pace)

Real computed values; fine. Need tabular numerals and a hierarchy pass
([03](03-ui-ux-audit-and-redesign.md) B4).

## Answers to the audit questions

| Question | Answer |
|----------|--------|
| Which charts use real data? | Radar (real distances), balance line (real transactions), benchmark user-values, stat tiles, PNG export |
| Which are placeholders? | None are pure placeholders |
| Which are misleading? | Balance line (window label + phantom sampling), benchmark bars (synthetic percentiles undisclosed, invented transport row) |
| Which are incompatible? | PNG export (dark palette on a light-theme product); radar labels at mobile widths |
| Which require redesign? | All three, plus the missing charts below |

## Missing charts the product needs

1. **Category breakdown donut/treemap** — the "domain breakdown" criticism is partly that the
   categories are never *shown* as a composition.
2. **Monthly cashflow bars** (income vs spend per month) — makes the burn trend legible.
3. **Runway projection band** — the balance line extended with the OLS projection and a
   confidence band; this is the product's core promise and currently has no visualization.
4. **Goal progress** — AHEAD pace is text-only today.
5. **Benchmark distribution strip** — replace bare percentile bars with a p25/p50/p75/p90
   strip and a "you" marker, which is what the data actually is.

## Library recommendation

**Keep Recharts** for the near term — needs are standard (radar, line, bar, donut), the team
knows it, and bundle cost is already paid on the PAST route. Adopt a thin wrapper
(`components/charts/`) so axes/tooltips/colors are consistent and theme-token driven.
Re-evaluate only if the redesign demands bespoke visuals (then **visx**) or if a full
dashboard kit is wanted (then **Tremor**, which would also standardize cards/KPIs). A rewrite
to a new chart library is *not* a priority relative to fixing honesty and adding the missing
charts.
