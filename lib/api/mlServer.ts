// FORE — lib/api/mlServer.ts
// Server-only helper for talking to the Python ML service on Render (CONTRACT-006).
// RENDER_ML_BASE_URL is read from the environment, never hardcoded, and only ever used
// server-side (Next.js API routes) so the URL is not shipped to the browser. The browser
// talks to our own same-origin /api/ml/* proxy routes instead, which keeps CORS simple and
// matches the "swap location" note in CONTRACTS.md (fetch to /api/ml/classify + /api/ml/burn-rate).

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

export function mlBaseUrl(): string {
  return process.env.RENDER_ML_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE_URL;
}

export interface MlError {
  error: string;
}

// CONTRACT-006: 5s client-side timeout, { error } shape on any failure, never throw raw.
export async function callMl<T>(
  path: string,
  body: unknown,
  timeoutMs = 5000
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const url = `${mlBaseUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      let detail = `ML service returned ${res.status}`;
      try {
        const j = await res.json();
        detail = j.detail || j.error || detail;
      } catch {
        /* non-JSON error body */
      }
      return { ok: false, status: res.status, error: detail };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 504 : 502,
      error: aborted
        ? "ML service timed out (is Render awake?)"
        : "ML service unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}
