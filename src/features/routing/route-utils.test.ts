import { describe, expect, it } from "vitest";
import type { RouteProvider } from "./types";
import {
  calculateRouteWithFallback,
  createStopsHash,
  splitRouteStops,
} from "./route-utils";

const point = (index: number) => ({
  latitude: -20 + index * 0.1,
  longitude: -40 + index * 0.1,
});

describe("route utilities", () => {
  it("generates a stable hash that includes stop order", () => {
    const stops = [point(1), point(2), point(3)];
    expect(createStopsHash(stops)).toBe(createStopsHash([...stops]));
    expect(createStopsHash(stops)).not.toBe(
      createStopsHash([stops[1], stops[0], stops[2]]),
    );
  });

  it("splits 50 stops into overlapping provider-safe segments", () => {
    const stops = Array.from({ length: 50 }, (_, index) => point(index));
    const segments = splitRouteStops(stops, 25);
    expect(segments.map((segment) => segment.length)).toEqual([25, 25, 2]);
    expect(segments[0].at(-1)).toEqual(segments[1][0]);
    expect(segments[1].at(-1)).toEqual(segments[2][0]);
  });

  it("returns a straight-line fallback when the provider fails", async () => {
    const failingProvider: RouteProvider = {
      calculateRoute: async () => {
        throw new Error("provider unavailable");
      },
    };
    const stops = [point(1), point(2)];
    const result = await calculateRouteWithFallback(failingProvider, stops);

    expect(result.isFallback).toBe(true);
    expect(result.provider).toBe("straight-line-fallback");
    expect(result.geometry.coordinates).toEqual(
      stops.map((stop) => [stop.longitude, stop.latitude]),
    );
    expect(result.distanceMeters).toBeGreaterThan(0);
  });
});
