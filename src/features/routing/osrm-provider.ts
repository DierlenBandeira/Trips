import { z } from "zod";
import type {
  RoutePoint,
  RouteProvider,
} from "@/features/routing/types";
import { splitRouteStops } from "@/features/routing/route-utils";
import { withTimeoutSignal } from "@/lib/api/fetch-signal";

const osrmResponseSchema = z.object({
  code: z.literal("Ok"),
  routes: z
    .array(
      z.object({
        distance: z.number().nonnegative(),
        geometry: z.object({
          type: z.literal("LineString"),
          coordinates: z
            .array(
              z.tuple([
                z.number().min(-180).max(180),
                z.number().min(-90).max(90),
              ]),
            )
            .max(200_000),
        }),
      }),
    )
    .min(1),
});

export class OsrmRouteProvider implements RouteProvider {
  constructor(
    private readonly baseUrl = "https://router.project-osrm.org",
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async calculateRoute(stops: RoutePoint[], signal?: AbortSignal) {
    if (stops.length < 2) {
      return {
        geometry: {
          type: "LineString" as const,
          coordinates: stops.map((stop) => [stop.longitude, stop.latitude]),
        },
        distanceMeters: 0,
        provider: "osrm",
      };
    }

    const segments = splitRouteStops(stops);
    const results = await Promise.all(
      segments.map((segment) => this.fetchSegment(segment, signal)),
    );
    const coordinates = results.flatMap((result, index) =>
      index === 0
        ? result.geometry.coordinates
        : result.geometry.coordinates.slice(1),
    );

    return {
      geometry: { type: "LineString" as const, coordinates },
      distanceMeters: results.reduce(
        (total, result) => total + result.distance,
        0,
      ),
      provider: "osrm",
    };
  }

  private async fetchSegment(stops: RoutePoint[], signal?: AbortSignal) {
    const coordinates = stops
      .map((stop) => `${stop.longitude},${stop.latitude}`)
      .join(";");
    const url = new URL(`/route/v1/driving/${coordinates}`, this.baseUrl);
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", "false");

    const response = await this.fetcher(url, {
      signal: withTimeoutSignal(signal, 12_000),
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Routing provider failed");

    return osrmResponseSchema.parse(await response.json()).routes[0];
  }
}
