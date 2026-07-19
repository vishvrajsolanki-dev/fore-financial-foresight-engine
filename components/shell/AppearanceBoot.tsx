"use client";

import { useEffect } from "react";
import { applyAppearance, readAppearance } from "@/lib/theme/appearance";

/** Applies saved Light / Evening preference on first paint. */
export default function AppearanceBoot() {
  useEffect(() => {
    applyAppearance(readAppearance());
  }, []);
  return null;
}
