import { z } from "zod";
import type {
  GeocodingProvider,
  GeocodingResult,
} from "@/features/geocoding/types";
import { withTimeoutSignal } from "@/lib/api/fetch-signal";

const photonFeatureSchema = z.object({
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
  }),
  properties: z.object({
    name: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    locality: z.string().optional(),
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
  features: z.array(photonFeatureSchema).max(20),
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

    return this.request(url, signal);
  }

  async reverse(latitude: number, longitude: number, signal?: AbortSignal) {
    const url = new URL("/reverse", this.baseUrl);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("limit", "1");

    const results = await this.request(url, signal, true);
    return results[0] ?? null;
  }

  private async request(
    url: URL,
    signal?: AbortSignal,
    preferCity = false,
  ) {
    const response = await this.fetcher(url, {
      signal: withTimeoutSignal(signal, 8_000),
      cache: "no-store",
      headers: {
        accept: "application/geo+json, application/json",
        "user-agent": "TripsPlanner/1.0 (server-side geocoding)",
      },
    });
    if (!response.ok) throw new Error("Geocoding provider failed");

    const payload = photonResponseSchema.parse(await response.json());
    return payload.features.map((feature) =>
      normalizeFeature(feature, preferCity),
    );
  }
}

function normalizeFeature(
  feature: z.infer<typeof photonFeatureSchema>,
  preferCity = false,
): GeocodingResult {
  const properties = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;
  const placeName = preferCity
    ? properties.city ||
      properties.locality ||
      properties.district ||
      properties.county ||
      properties.name ||
      "Local selecionado"
    : properties.name ||
      properties.city ||
      properties.locality ||
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
