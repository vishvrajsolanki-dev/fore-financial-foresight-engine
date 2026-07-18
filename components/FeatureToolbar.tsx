"use client";

import { useEffect, useState } from "react";
import { features } from "@/lib/features";
import type { CurrencyCode } from "@/lib/format/currency";

type Theme = "dark" | "light";

interface Props {
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
}

export default function FeatureToolbar({ currency, onCurrencyChange }: Props) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("fore_theme") as Theme | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("fore_theme", theme);
  }, [theme]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {features.darkMode && (
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀ Light" : "🌙 Dark"}
        </button>
      )}
      {features.multiCurrency && (
        <select
          className="input max-w-[5.5rem] text-xs py-1"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          aria-label="Display currency"
        >
          <option value="INR">₹ INR</option>
          <option value="USD">$ USD</option>
          <option value="EUR">€ EUR</option>
        </select>
      )}
    </div>
  );
}
