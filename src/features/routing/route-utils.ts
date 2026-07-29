import type {
  RoutePoint,
  RouteProvider,
  RouteResult,
} from "@/features/routing/types";

export const MAX_STOPS_PER_SEGMENT = 25;

export function createStopsHash(stops: RoutePoint[]) {
  const canonical = stops
    .map(
      (stop, index) =>
        `${index}:${stop.latitude.toFixed(6)},${stop.longitude.toFixed(6)}`,
    )
    .join("|");
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `route-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function splitRouteStops(
  stops: RoutePoint[],
  limit = MAX_STOPS_PER_SEGMENT,
) {
  if (limit < 2) throw new Error("Route segment limit must be at least two");
  const segments: RoutePoint[][] = [];
  for (let start = 0; start < stops.length - 1; start += limit - 1) {
    const segment = stops.slice(start, start + limit);
    if (segment.length >= 2) segments.push(segment);
  }
  return segments;
}

export async function calculateRouteWithFallback(
  provider: RouteProvider,
  stops: RoutePoint[],
  signal?: AbortSignal,
): Promise<RouteResult> {
  const stopsHash = createStopsHash(stops);
  try {
    const route = await provider.calculateRoute(stops, signal);
    return { ...route, stopsHash, isFallback: false };
  } catch {
    return {
      geometry: {
        type: "LineString",
        coordinates: stops.map((stop) => [stop.longitude, stop.latitude]),
      },
      distanceMeters: straightLineDistance(stops),
      provider: "straight-line-fallback",
      stopsHash,
      isFallback: true,
      warning:
        "A rota rodoviária não pôde ser calculada. Exibindo uma linha aproximada.",
    };
  }
}

function straightLineDistance(stops: RoutePoint[]) {
  let total = 0;
  for (let index = 1; index < stops.length; index += 1) {
    total += haversineDistance(stops[index - 1], stops[index]);
  }
  return total;
}

function haversineDistance(from: RoutePoint, to: RoutePoint) {
  const earthRadius = 6_371_000;
  const latitudeDelta = degreesToRadians(to.latitude - from.latitude);
  const longitudeDelta = degreesToRadians(to.longitude - from.longitude);
  const firstLatitude = degreesToRadians(from.latitude);
  const secondLatitude = degreesToRadians(to.latitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
