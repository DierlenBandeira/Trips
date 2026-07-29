import { describe, expect, it, vi } from "vitest";
import { PhotonGeocodingProvider } from "@/features/geocoding/photon-provider";

const munichResponse = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        osm_type: "N",
        osm_id: 340004718,
        name: "Mariensäule",
        street: "Marienplatz",
        district: "Altstadt",
        city: "München",
        state: "Bayern",
        country: "Deutschland",
        postcode: "80331",
      },
      geometry: {
        type: "Point",
        coordinates: [11.5755058, 48.1372256],
      },
    },
  ],
};

describe("PhotonGeocodingProvider", () => {
  it("prioriza a cidade na geocodificação reversa", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(createResponse);
    const provider = new PhotonGeocodingProvider(
      "https://photon.example",
      fetcher,
    );

    const result = await provider.reverse(48.1372, 11.5756);

    expect(result?.placeName).toBe("München");
    expect(result?.formattedAddress).toContain("München");
  });

  it("não envia um idioma incompatível com a instância pública", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(createResponse);
    const provider = new PhotonGeocodingProvider(
      "https://photon.example",
      fetcher,
    );

    await provider.search("München");
    await provider.reverse(48.1372, 11.5756);

    for (const [url] of fetcher.mock.calls) {
      expect(new URL(String(url)).searchParams.has("lang")).toBe(false);
    }
  });
});

async function createResponse() {
  return new Response(JSON.stringify(munichResponse), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
