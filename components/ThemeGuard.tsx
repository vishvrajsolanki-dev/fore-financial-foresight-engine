"use client";

import { useEffect } from "react";

/** Warm Ledger is the only theme — clear any persisted dark-mode override on load. */
export default function ThemeGuard() {
  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("fore_theme");
  }, []);
  return null;
}
