import { createHash, timingSafeEqual } from "node:crypto";

export function canAccessSharedTrip(
  visibility: string,
  expectedShareToken: string | null,
  providedShareToken?: string | null,
) {
  if (visibility === "public") return true;
  if (visibility !== "unlisted") return false;
  if (!expectedShareToken || !providedShareToken) return false;

  const expected = createHash("sha256").update(expectedShareToken).digest();
  const provided = createHash("sha256").update(providedShareToken).digest();
  return timingSafeEqual(expected, provided);
}
