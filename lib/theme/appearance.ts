export type Appearance = "light" | "evening";

const KEY = "fore_appearance";

export function readAppearance(): Appearance {
  if (typeof window === "undefined") return "light";
  const v = window.localStorage.getItem(KEY);
  return v === "evening" ? "evening" : "light";
}

export function applyAppearance(appearance: Appearance) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-appearance", appearance);
  window.localStorage.setItem(KEY, appearance);
}

export async function syncAppearanceToServer(appearance: Appearance, fullStack: boolean) {
  applyAppearance(appearance);
  if (!fullStack) return;
  try {
    await fetch("/api/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appearance }),
    });
  } catch {
    /* ignore — local preference still applied */
  }
}
