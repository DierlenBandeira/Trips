import { describe, expect, it } from "vitest";
import { createMapSegments } from "./map-segments";

const stops = [
  { id: "munich", longitude: 11, latitude: 48 },
  { id: "vienna", longitude: 16, latitude: 48 },
  { id: "budapest", longitude: 19, latitude: 47 },
];
const route = [
  [11, 48],
  [12, 49],
  [14, 49],
  [16, 48],
  [17, 47.5],
  [19, 47],
];

describe("mixed map segments", () => {
  it("keeps OSRM geometry for roads and creates a curved flight arc", () => {
    const result = createMapSegments(route, stops, [
      {
        from_stop_id: "vienna",
        to_stop_id: "budapest",
        transport_mode: "flight",
      },
    ]);

    expect(result.road).toEqual([route.slice(0, 4)]);
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0]).toHaveLength(33);
    expect(result.flights[0][0]).toEqual([16, 48]);
    expect(result.flights[0].at(-1)?.[0]).toBeCloseTo(19);
    expect(result.flights[0].at(-1)?.[1]).toBeCloseTo(47);
    expect(result.flights[0][16]).not.toEqual([17.5, 47.5]);
  });

  it("falls back to direct road segments when no route is available", () => {
    expect(createMapSegments(undefined, stops, []).road).toEqual([
      [
        [11, 48],
        [16, 48],
      ],
      [
        [16, 48],
        [19, 47],
      ],
    ]);
  });
});
