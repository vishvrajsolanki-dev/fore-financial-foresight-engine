/** Tier 2 feature flags — default true in production demo; set to "false" to disable. */
function flag(name: string, defaultOn = true): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultOn;
  return v === "true" || v === "1";
}

export const features = {
  selfVerify: flag("NEXT_PUBLIC_FEATURE_SELF_VERIFY"),
  browserStorage: flag("NEXT_PUBLIC_FEATURE_BROWSER_STORAGE"),
  darkMode: flag("NEXT_PUBLIC_FEATURE_DARK_MODE"),
  loadingSkeletons: flag("NEXT_PUBLIC_FEATURE_LOADING_SKELETONS"),
  chartAnimations: flag("NEXT_PUBLIC_FEATURE_CHART_ANIMATIONS"),
  multiCurrency: flag("NEXT_PUBLIC_FEATURE_MULTI_CURRENCY"),
  voiceInput: flag("NEXT_PUBLIC_FEATURE_VOICE_INPUT"),
  voiceNarration: flag("NEXT_PUBLIC_FEATURE_VOICE_NARRATION"),
  exaGrounding: flag("NEXT_PUBLIC_FEATURE_EXA_GROUNDING"),
  exportAhead: flag("NEXT_PUBLIC_FEATURE_EXPORT_AHEAD"),
  transportBenchmark: flag("NEXT_PUBLIC_FEATURE_TRANSPORT_BENCHMARK"),
  personaCompare: flag("NEXT_PUBLIC_FEATURE_PERSONA_COMPARE"),
} as const;
