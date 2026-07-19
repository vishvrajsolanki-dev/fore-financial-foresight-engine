/**
 * Rate limiter: Upstash Redis REST when configured, else in-memory sliding window.
 * Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for multi-instance production.
 */

type Bucket = { timestamps: number[] };
const memoryBuckets = new Map<string, Bucket>();

function memoryLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = memoryBuckets.get(opts.key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < opts.windowMs);
  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000));
    memoryBuckets.set(opts.key, bucket);
    return { ok: false, retryAfterSec };
  }
  bucket.timestamps.push(now);
  memoryBuckets.set(opts.key, bucket);
  return { ok: true };
}

async function upstashLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const redisKey = `fore:rl:${opts.key}`;
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  try {
    // Pipeline: ZREMRANGEBYSCORE, ZADD, ZCARD, EXPIRE
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", redisKey, "0", String(windowStart)],
        ["ZADD", redisKey, String(now), `${now}:${Math.random()}`],
        ["ZCARD", redisKey],
        ["PEXPIRE", redisKey, String(opts.windowMs)],
      ]),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown }[];
    const count = Number(data?.[2]?.result ?? 0);
    if (count > opts.limit) {
      return { ok: false, retryAfterSec: Math.ceil(opts.windowMs / 1000) };
    }
    return { ok: true };
  } catch {
    return null;
  }
}

export async function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const redis = await upstashLimit(opts);
  if (redis) return redis;
  return memoryLimit(opts);
}

export function clientKey(req: Request, prefix: string): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || "unknown";
  return `${prefix}:${ip}`;
}

/** Prefer authenticated user id for AI quotas; fall back to IP. */
export function actorKey(req: Request, prefix: string, userId?: string | null): string {
  if (userId) return `${prefix}:user:${userId}`;
  return clientKey(req, prefix);
}
