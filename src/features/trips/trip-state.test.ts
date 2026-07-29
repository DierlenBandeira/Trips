import { describe, expect, it } from "vitest";
import type { TripStop } from "./types";
import { reorderStops } from "./trip-state";

const stop = (id: string, position: number): TripStop => ({
  id,
  position,
  trip_id: "trip",
  place_name: id,
  country: null,
  region: null,
  formatted_address: null,
  latitude: 0,
  longitude: 0,
  nightly_cost: 0,
  nights: 0,
  notes: null,
  created_at: "",
  updated_at: "",
});

describe("stop ordering", () => {
  it("reorders stops and normalizes their positions", () => {
    const result = reorderStops(
      [stop("a", 0), stop("b", 1), stop("c", 2)],
      ["c", "a", "b"],
    );
    expect(result.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: "c", position: 0 },
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]);
  });
});
