import { describe, expect, it } from "vitest";
import {
  createStopSchema,
  createTripSchema,
  reorderStopsSchema,
} from "./schemas";

describe("API schemas", () => {
  it("normalizes and applies defaults to a trip", () => {
    const trip = createTripSchema.parse({ name: "  Itália  ", slug: "italia-2026" });
    expect(trip).toEqual({
      name: "Itália",
      slug: "italia-2026",
      currency: "EUR",
      travelersCount: 1,
      visibility: "private",
    });
  });

  it("rejects coordinates outside the globe", () => {
    expect(() =>
      createStopSchema.parse({
        position: 0,
        placeName: "Lisboa",
        latitude: 91,
        longitude: -9.14,
      }),
    ).toThrow();
  });

  it("rejects duplicate stop ids when reordering", () => {
    const id = "c7eb3517-017d-4f0e-9f29-2b4994fd6d15";
    expect(() => reorderStopsSchema.parse({ stopIds: [id, id] })).toThrow();
  });
});
