import { z } from "zod";
import { PhotonGeocodingProvider } from "@/features/geocoding/photon-provider";
import type { GeocodingResult } from "@/features/geocoding/types";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { requireTripEditor } from "@/lib/api/trips";
import { TtlCache } from "@/lib/cache/ttl-cache";
import { getServerEnv } from "@/lib/env/server";

const querySchema = z.string().trim().min(2).max(120);
const tripIdSchema = z.uuid();
const cache = new TtlCache<GeocodingResult[]>(1000 * 60 * 60 * 24, 1000);

export async function GET(request: Request) {
  const limited = applyRateLimit(request, "geocoding-search", 30);
  if (limited) return limited;

  try {
    const searchParams = new URL(request.url).searchParams;
    const tripId = tripIdSchema.parse(searchParams.get("tripId"));
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const query = querySchema.parse(searchParams.get("q"));
    const cacheKey = query.toLocaleLowerCase("pt-BR");
    const cached = cache.get(cacheKey);
    if (cached) return ok(cached);

    const provider = new PhotonGeocodingProvider(
      getServerEnv().GEOCODING_BASE_URL,
    );
    const results = await provider.search(query, request.signal);
    cache.set(cacheKey, results);
    return ok(results);
  } catch (error) {
    return handleApiError(error);
  }
}
