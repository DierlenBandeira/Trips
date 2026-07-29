import type { Trip, TripStop } from "@/features/trips/types";

export function tripToUpdatePayload(
  trip: Pick<Trip, "name" | "currency" | "travelers_count">,
) {
  return {
    name: trip.name,
    currency: trip.currency,
    travelersCount: trip.travelers_count,
  };
}

export function stopChangesToPayload(changes: Partial<TripStop>) {
  const payload: Record<string, unknown> = {};
  if (changes.place_name !== undefined) payload.placeName = changes.place_name;
  if (changes.country !== undefined) payload.country = changes.country;
  if (changes.region !== undefined) payload.region = changes.region;
  if (changes.formatted_address !== undefined) {
    payload.formattedAddress = changes.formatted_address;
  }
  if (changes.latitude !== undefined) payload.latitude = changes.latitude;
  if (changes.longitude !== undefined) payload.longitude = changes.longitude;
  if (changes.nightly_cost !== undefined) {
    payload.nightlyCost = changes.nightly_cost;
  }
  if (changes.nights !== undefined) payload.nights = changes.nights;
  if (changes.notes !== undefined) payload.notes = changes.notes;
  return payload;
}

export function mergeStopChanges(
  current: Partial<TripStop> | undefined,
  incoming: Partial<TripStop>,
) {
  return { ...current, ...incoming };
}
