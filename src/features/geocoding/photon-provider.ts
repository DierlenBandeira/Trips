import { z } from "zod";
import type {
  GeocodingProvider,
  GeocodingResult,
} from "@/features/geocoding/types";

const photonFeatureSchema = z.object({
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  properties: z.object({
    name: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    county: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    countrycode: z.string().optional(),
    street: z.string().optional(),
    housenumber: z.string().optional(),
    postcode: z.string().optional(),
    osm_type: z.string().optional(),
    osm_id: z.union([z.string(), z.number()]).optional(),
  }),
});

const photonResponseSchema = z.object({
  features: z.array(photonFeatureSchema),
});

export class PhotonGeocodingProvider implements GeocodingProvider {
  constructor(
    private readonly baseUrl = "https://photon.komoot.io",
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async search(query: string, signal?: AbortSignal) {
    const url = new URL("/api", this.baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("lang", "pt");

    return this.request(url, signal);
  }

  async reverse(latitude: number, longitude: number, signal?: AbortSignal) {
    const url = new URL("/reverse", this.baseUrl);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("limit", "1");
    url.searchParams.set("lang", "pt");

    const results = await this.request(url, signal);
    return results[0] ?? null;
  }

  private async request(url: URL, signal?: AbortSignal) {
    const response = await this.fetcher(url, {
      signal,
      headers: {
        accept: "application/geo+json, application/json",
        "user-agent": "TripsPlanner/1.0 (server-side geocoding)",
      },
    });
    if (!response.ok) throw new Error("Geocoding provider failed");

    const payload = photonResponseSchema.parse(await response.json());
    return payload.features.map(normalizeFeature);
  }
}

function normalizeFeature(
  feature: z.infer<typeof photonFeatureSchema>,
): GeocodingResult {
  const properties = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;
  const placeName =
    properties.name ||
    properties.city ||
    properties.district ||
    properties.county ||
    "Local selecionado";
  const addressParts = [
    [properties.street, properties.housenumber].filter(Boolean).join(" "),
    properties.city || properties.district,
    properties.state,
    properties.country,
  ].filter((part, index, parts) => part && parts.indexOf(part) === index);

  return {
    id:
      properties.osm_type && properties.osm_id
        ? `${properties.osm_type}-${properties.osm_id}`
        : `${latitude.toFixed(6)}-${longitude.toFixed(6)}`,
    placeName,
    country: properties.country ?? null,
    region: properties.state ?? properties.county ?? null,
    formattedAddress: addressParts.join(", ") || placeName,
    latitude,
    longitude,
  };
}
