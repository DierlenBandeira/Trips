import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const EDIT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const EDIT_COOKIE_PATH = "/api";

export function generateToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function editCookieName(tripId: string) {
  return `trip_edit_${tripId}`;
}
