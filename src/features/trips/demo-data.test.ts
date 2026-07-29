import { describe, expect, it } from "vitest";
import { demoTrip } from "./demo-data";

describe("demo trip", () => {
  it("contains the nine documented cities with valid costs and coordinates", () => {
    expect(demoTrip.stops.map((stop) => stop.placeName)).toEqual([
      "Berlim",
      "Budapeste",
      "Zagreb",
      "Sarajevo",
      "Podgorica",
      "Bari",
      "Catânia",
      "Roma",
      "Milão",
    ]);
    for (const stop of demoTrip.stops) {
      expect(stop.nightlyCost).toBeGreaterThanOrEqual(0);
      expect(stop.nights).toBeGreaterThanOrEqual(0);
      expect(stop.latitude).toBeGreaterThanOrEqual(-90);
      expect(stop.latitude).toBeLessThanOrEqual(90);
      expect(stop.longitude).toBeGreaterThanOrEqual(-180);
      expect(stop.longitude).toBeLessThanOrEqual(180);
    }
  });
});
