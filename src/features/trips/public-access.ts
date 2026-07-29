export function canAccessSharedTrip(
  visibility: string,
  expectedShareToken: string | null,
  providedShareToken?: string | null,
) {
  if (visibility === "public") return true;
  if (visibility !== "unlisted") return false;
  return Boolean(
    expectedShareToken &&
      providedShareToken &&
      expectedShareToken === providedShareToken,
  );
}
