import type { TripLeg, TripStop } from "@/features/trips/types";

type MapStop = Pick<TripStop, "id" | "latitude" | "longitude">;
type MapLeg = Pick<
  TripLeg,
  "from_stop_id" | "to_stop_id" | "transport_mode"
>;
type Coordinate = [number, number];

export function createMapSegments(
  routeCoordinates: number[][] | undefined,
  stops: MapStop[],
  legs: MapLeg[],
) {
  const flightPairs = new Set(
    legs
      .filter((leg) => leg.transport_mode === "flight")
      .map((leg) => `${leg.from_stop_id}:${leg.to_stop_id}`),
  );
  const waypointIndexes = findWaypointIndexes(routeCoordinates ?? [], stops);
  const road: Coordinate[][] = [];
  const flights: Coordinate[][] = [];

  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];
    if (flightPairs.has(`${from.id}:${to.id}`)) {
      flights.push(createFlightArc(from, to));
      continue;
    }

    const routeStart = waypointIndexes[index];
    const routeEnd = waypointIndexes[index + 1];
    const routedSegment =
      routeStart !== undefined &&
      routeEnd !== undefined &&
      routeEnd > routeStart
        ? routeCoordinates?.slice(routeStart, routeEnd + 1)
        : undefined;
    road.push(
      routedSegment && routedSegment.length >= 2
        ? routedSegment.map(
            ([longitude, latitude]) => [longitude, latitude] as Coordinate,
          )
        : [
            [from.longitude, from.latitude],
            [to.longitude, to.latitude],
          ],
    );
  }

  return { road, flights };
}

function findWaypointIndexes(
  routeCoordinates: number[][],
  stops: MapStop[],
) {
  if (routeCoordinates.length === 0) return [];
  const indexes: number[] = [];
  let searchFrom = 0;

  for (const stop of stops) {
    let nearestIndex = searchFrom;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = searchFrom; index < routeCoordinates.length; index += 1) {
      const [longitude, latitude] = routeCoordinates[index];
      const longitudeScale = Math.cos((stop.latitude * Math.PI) / 180);
      const distance =
        ((longitude - stop.longitude) * longitudeScale) ** 2 +
        (latitude - stop.latitude) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    indexes.push(nearestIndex);
    searchFrom = nearestIndex;
  }
  return indexes;
}

export function createFlightArc(from: MapStop, to: MapStop): Coordinate[] {
  let longitudeDelta = to.longitude - from.longitude;
  if (longitudeDelta > 180) longitudeDelta -= 360;
  if (longitudeDelta < -180) longitudeDelta += 360;
  const latitudeDelta = to.latitude - from.latitude;
  const bend = Math.min(18, Math.hypot(longitudeDelta, latitudeDelta) * 0.18);
  const length = Math.hypot(longitudeDelta, latitudeDelta) || 1;
  const perpendicularLongitude = (-latitudeDelta / length) * bend;
  const perpendicularLatitude = (longitudeDelta / length) * bend;

  return Array.from({ length: 33 }, (_, index) => {
    const progress = index / 32;
    const curve = 4 * progress * (1 - progress);
    let longitude =
      from.longitude +
      longitudeDelta * progress +
      perpendicularLongitude * curve;
    longitude = ((longitude + 540) % 360) - 180;
    const latitude = Math.max(
      -85,
      Math.min(
        85,
        from.latitude +
          latitudeDelta * progress +
          perpendicularLatitude * curve,
      ),
    );
    return [longitude, latitude];
  });
}
