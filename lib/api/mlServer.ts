// Server-only ML client: inline TypeScript (Vercel-only) or external Render Python service.

import { isInlineMl, runInlineMl } from "@/lib/ml/runInline";

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

export function mlBaseUrl(): string {
  return process.env.RENDER_ML_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE_URL;
}

export interface MlError {
  error: string;
}

export async function callMl<T>(
  path: string,
  body: unknown,
  timeoutMs = 5000
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  if (isInlineMl()) {
    try {
      const data = await runInlineMl<T>(path, body);
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        status: 400,
        error: err instanceof Error ? err.message : "Inline ML failed",
      };
    }
  }

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
        ? "ML service timed out"
        : "ML service unreachable — set ML_MODE=inline for Vercel-only deploy (no Render needed)",
    };
  } finally {
    clearTimeout(timer);
  }
}
