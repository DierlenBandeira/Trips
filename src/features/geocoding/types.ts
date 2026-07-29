export type GeocodingResult = {
  id: string;
  placeName: string;
  country: string | null;
  region: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export interface GeocodingProvider {
  search(query: string, signal?: AbortSignal): Promise<GeocodingResult[]>;
  reverse(
    latitude: number,
    longitude: number,
    signal?: AbortSignal,
  ): Promise<GeocodingResult | null>;
}
