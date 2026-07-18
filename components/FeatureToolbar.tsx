"use client";

import type { CurrencyCode } from "@/lib/format/currency";
import { features } from "@/lib/features";

interface Props {
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
}

export default function FeatureToolbar({ currency, onCurrencyChange }: Props) {
  if (!features.multiCurrency) return null;

  return (
    <select
      className="input max-w-[6.5rem] text-xs py-1.5"
      value={currency}
      onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
      aria-label="Display currency"
    >
      <option value="INR">₹ INR</option>
      <option value="USD">$ USD</option>
      <option value="EUR">€ EUR</option>
    </select>
  );
}
