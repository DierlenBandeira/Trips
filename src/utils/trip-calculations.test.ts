import { describe, expect, it } from "vitest";
import { calculateTripKpis, stopSubtotal } from "./trip-calculations";

describe("trip calculations", () => {
  const stops = [
    { nightly_cost: 100, nights: 2 },
    { nightly_cost: 80, nights: 3 },
  ];

  it("calculates a stop subtotal", () => {
    expect(stopSubtotal(stops[0])).toBe(200);
  });

  it("calculates totals, average and cost per person", () => {
    expect(calculateTripKpis(stops, 2)).toEqual({
      lodgingTotal: 440,
      totalNights: 5,
      destinationCount: 2,
      averageNightlyCost: 88,
      lodgingPerPerson: 220,
    });
  });

  it("does not divide by zero", () => {
    expect(calculateTripKpis([], 0).averageNightlyCost).toBe(0);
    expect(calculateTripKpis([], 0).lodgingPerPerson).toBe(0);
  });
});
