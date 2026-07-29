import { z } from "zod";
import { OsrmRouteProvider } from "@/features/routing/osrm-provider";
import {
  calculateRouteWithFallback,
  createStopsHash,
} from "@/features/routing/route-utils";
import type { RouteResult } from "@/features/routing/types";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { requireTripEditor } from "@/lib/api/trips";
import { TtlCache } from "@/lib/cache/ttl-cache";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

const routeSchema = z.object({
  tripId: z.uuid(),
  stops: z
    .array(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    )
    .min(2)
    .max(50),
});
const routeGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.array(z.number()).length(2)),
});
const cache = new TtlCache<RouteResult>(1000 * 60 * 60 * 6, 500);

export async function POST(request: Request) {
  const limited = applyRateLimit(request, "routing", 20);
  if (limited) return limited;

  try {
    const { tripId, stops } = routeSchema.parse(await request.json());
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }

    const stopsHash = createStopsHash(stops);
    const admin = createAdminClient();
    const { data: persisted, error: readError } = await admin
      .from("trip_route_cache")
      .select(
        "route_geometry,route_distance_meters,route_provider,stops_hash",
      )
      .eq("trip_id", tripId)
      .eq("stops_hash", stopsHash)
      .maybeSingle();
    if (readError) throw new Error("Route cache read failed");

    if (persisted) {
      const geometry = routeGeometrySchema.safeParse(persisted.route_geometry);
      if (geometry.success) {
        const persistedRoute: RouteResult = {
          geometry: geometry.data,
          distanceMeters: Number(persisted.route_distance_meters || 0),
          provider: persisted.route_provider,
          stopsHash: persisted.stops_hash,
          isFallback: false,
        };
        cache.set(stopsHash, persistedRoute);
        return ok(persistedRoute);
      }
    }

    let route = cache.get(stopsHash);
    if (!route) {
      const provider = new OsrmRouteProvider(getServerEnv().ROUTING_BASE_URL);
      route = await calculateRouteWithFallback(
        provider,
        stops,
        request.signal,
      );
    }
    cache.set(stopsHash, route);

    if (!route.isFallback) {
      const { error: writeError } = await admin
        .from("trip_route_cache")
        .upsert(
          {
            trip_id: tripId,
            stops_hash: route.stopsHash,
            route_geometry: route.geometry,
            route_distance_meters: route.distanceMeters,
            route_provider: route.provider,
          },
          { onConflict: "trip_id,stops_hash" },
        );
      if (writeError) throw new Error("Route cache write failed");
    }

    return ok(route);
  } catch (error) {
    return handleApiError(error);
  }
}
