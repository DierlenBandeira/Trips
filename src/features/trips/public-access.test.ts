import { describe, expect, it } from "vitest";
import { canAccessSharedTrip } from "./public-access";

describe("public trip access", () => {
  it("allows public trips without a token", () => {
    expect(canAccessSharedTrip("public", null)).toBe(true);
  });

  it("requires the exact public token for unlisted trips", () => {
    expect(canAccessSharedTrip("unlisted", "share-token", "share-token")).toBe(
      true,
    );
    expect(canAccessSharedTrip("unlisted", "share-token", "wrong")).toBe(false);
    expect(canAccessSharedTrip("unlisted", "share-token")).toBe(false);
  });

  it("never exposes private trips", () => {
    expect(canAccessSharedTrip("private", "share-token", "share-token")).toBe(
      false,
    );
  });
});
