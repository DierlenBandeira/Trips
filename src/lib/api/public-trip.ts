import "server-only";
import { z } from "zod";
import { canAccessSharedTrip } from "@/features/trips/public-access";
import { createStopsHash } from "@/features/routing/route-utils";
import type { RouteResult } from "@/features/routing/types";
import { createAdminClient } from "@/lib/supabase/admin";

const internalTripFields =
  "id,name,slug,currency,travelers_count,visibility,share_token";
const publicStopFields =
  "position,place_name,country,region,formatted_address,latitude,longitude,nightly_cost,nights,notes";
const publicLegFields =
  "from_stop_id,to_stop_id,transport_mode,transport_cost";
const routeGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .max(200_000),
});

export async function getPublicTripBySlug(
  slug: string,
  providedShareToken?: string | null,
) {
  const admin = createAdminClient();
  const { data: trip, error } = await admin
    .from("trips")
    .select(internalTripFields)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error("Public trip query failed");
  if (
    !trip ||
    !canAccessSharedTrip(
      trip.visibility,
      trip.share_token,
      providedShareToken,
    )
  ) {
    return null;
  }

  return loadPublicPayload(trip);
}

export async function getPublicTripByToken(shareToken: string) {
  const { data: trip, error } = await createAdminClient()
    .from("trips")
    .select(internalTripFields)
    .eq("share_token", shareToken)
    .in("visibility", ["unlisted", "public"])
    .maybeSingle();

  if (error) throw new Error("Public trip query failed");
  return trip ? loadPublicPayload(trip) : null;
}

async function loadPublicPayload(trip: {
  id: string;
  name: string;
  slug: string;
  currency: string;
  travelers_count: number;
  visibility: string;
  share_token: string | null;
}) {
  const admin = createAdminClient();
  const [{ data: stops, error }, { data: legs, error: legsError }] =
    await Promise.all([
      admin
        .from("trip_stops")
        .select(`id,${publicStopFields}`)
        .eq("trip_id", trip.id)
        .order("position"),
      admin
        .from("trip_legs")
        .select(publicLegFields)
        .eq("trip_id", trip.id),
    ]);
  if (error || legsError) throw new Error("Public itinerary query failed");

  let route: RouteResult | null = null;
  if (stops.length >= 2) {
    const stopsHash = createStopsHash(stops);
    const { data: cachedRoute, error: routeError } = await admin
      .from("trip_route_cache")
      .select(
        "route_geometry,route_distance_meters,route_provider,stops_hash",
      )
      .eq("trip_id", trip.id)
      .eq("stops_hash", stopsHash)
      .maybeSingle();
    if (routeError) throw new Error("Public route query failed");

    if (cachedRoute) {
      const geometry = routeGeometrySchema.safeParse(
        cachedRoute.route_geometry,
      );
      if (geometry.success) {
        route = {
          geometry: geometry.data,
          distanceMeters: Number(cachedRoute.route_distance_meters || 0),
          provider: cachedRoute.route_provider,
          stopsHash: cachedRoute.stops_hash,
          isFallback: false,
        };
      }
    }
  }

  return {
    name: trip.name,
    slug: trip.slug,
    currency: trip.currency,
    travelers_count: trip.travelers_count,
    visibility: trip.visibility,
    stops: stops.map((stop) => ({
      ...stop,
      id: stop.id,
    })),
    legs: legs.map((leg, index) => ({
      ...leg,
      id: `leg-${index + 1}`,
      trip_id: trip.id,
      created_at: "",
      updated_at: "",
    })),
    route,
  };
}
