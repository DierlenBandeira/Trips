import { describe, expect, it } from "vitest";
import {
  mergeStopChanges,
  stopChangesToPayload,
  tripToUpdatePayload,
} from "./persistence";

describe("trip persistence", () => {
  it("creates a complete metadata snapshot for reload", () => {
    expect(
      tripToUpdatePayload({
        name: "Bálcãs",
        currency: "EUR",
        travelers_count: 3,
      }),
    ).toEqual({
      name: "Bálcãs",
      currency: "EUR",
      travelersCount: 3,
    });
  });

  it("merges debounced stop edits without losing previous fields", () => {
    expect(
      mergeStopChanges(
        { nightly_cost: 120, notes: "Perto do centro" },
        { nights: 4, nightly_cost: 135 },
      ),
    ).toEqual({
      nightly_cost: 135,
      nights: 4,
      notes: "Perto do centro",
    });
  });

  it("maps database-shaped stop fields to the API contract", () => {
    expect(
      stopChangesToPayload({
        nightly_cost: 90,
        nights: 2,
        formatted_address: "Roma, Itália",
      }),
    ).toEqual({
      nightlyCost: 90,
      nights: 2,
      formattedAddress: "Roma, Itália",
    });
  });
});
