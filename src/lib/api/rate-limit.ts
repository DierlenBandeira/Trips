import { createHash } from "node:crypto";
import { fail } from "@/lib/api/response";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function applyRateLimit(
  request: Request,
  scope: string,
  limit = 60,
  windowMs = 60_000,
) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("base64url");
  const key = `${scope}:${ipHash}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    return fail(
      "RATE_LIMITED",
      "Muitas requisições. Tente novamente em instantes.",
      429,
    );
  }

  current.count += 1;

  if (buckets.size >= 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    while (buckets.size >= 10_000) {
      const oldestKey = buckets.keys().next().value;
      if (!oldestKey) break;
      buckets.delete(oldestKey);
    }
  }

  return null;
}
