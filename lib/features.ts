/** All Tier 2/3 features locked ON for production demo. Dark mode disabled — Warm Ledger only. */
export const features = {
  selfVerify: true,
  browserStorage: true,
  darkMode: false,
  loadingSkeletons: true,
  chartAnimations: true,
  multiCurrency: true,
  voiceInput: true,
  voiceNarration: true,
  exaGrounding: true,
  exportAhead: true,
  transportBenchmark: false, // invented transport row removed — only show if real transport spend exists
  personaCompare: true,
} as const;
