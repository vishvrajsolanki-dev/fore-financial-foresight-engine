const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // refresh before 15-min access token expires

export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function startTokenRefreshLoop(enabled: boolean): () => void {
  if (!enabled || typeof window === "undefined") return () => {};

  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    void refreshAccessToken();
  };

  timer = setInterval(tick, REFRESH_INTERVAL_MS);
  // Initial refresh if session may be stale after page load
  void refreshAccessToken();

  return () => {
    if (timer) clearInterval(timer);
  };
}
