import { z } from "zod";
import { PhotonGeocodingProvider } from "@/features/geocoding/photon-provider";
import type { GeocodingResult } from "@/features/geocoding/types";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { handleApiError, ok } from "@/lib/api/response";
import { TtlCache } from "@/lib/cache/ttl-cache";
import { getServerEnv } from "@/lib/env/server";

const coordinatesSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
const cache = new TtlCache<GeocodingResult | null>(
  1000 * 60 * 60 * 24 * 7,
  1000,
);

export async function GET(request: Request) {
  const limited = applyRateLimit(request, "geocoding-reverse", 30);
  if (limited) return limited;

  try {
    const searchParams = new URL(request.url).searchParams;
    const coordinates = coordinatesSchema.parse({
      latitude: searchParams.get("lat"),
      longitude: searchParams.get("lon"),
    });
    const cacheKey = `${coordinates.latitude.toFixed(5)},${coordinates.longitude.toFixed(5)}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return ok(cached);

    const provider = new PhotonGeocodingProvider(
      getServerEnv().GEOCODING_BASE_URL,
    );
    const result = await provider.reverse(
      coordinates.latitude,
      coordinates.longitude,
      request.signal,
    );
    cache.set(cacheKey, result);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
