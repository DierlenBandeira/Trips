import { describe, expect, it } from "vitest";
import {
  ApiRequestError,
  assertSameOrigin,
  readJsonBody,
} from "./request";

describe("proteção de requisições", () => {
  it("aceita JSON da mesma origem", async () => {
    const request = new Request("https://trips.example/api/trips", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://trips.example",
      },
      body: JSON.stringify({ name: "Teste" }),
    });

    await expect(readJsonBody(request)).resolves.toEqual({ name: "Teste" });
  });

  it("bloqueia origem cruzada", () => {
    const request = new Request("https://trips.example/api/trips", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    });

    expect(() => assertSameOrigin(request)).toThrowError(ApiRequestError);
  });

  it("bloqueia mídia e payload acima do limite", async () => {
    const wrongType = new Request("https://trips.example/api/trips", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    await expect(readJsonBody(wrongType)).rejects.toMatchObject({ status: 415 });

    const oversized = new Request("https://trips.example/api/trips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(100) }),
    });
    await expect(readJsonBody(oversized, 32)).rejects.toMatchObject({
      status: 413,
    });
  });
});
