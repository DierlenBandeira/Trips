export type Currency = "EUR" | "BRL" | "USD" | "GBP";

export type TripStop = {
  id: string;
  trip_id: string;
  position: number;
  place_name: string;
  country: string | null;
  region: string | null;
  formatted_address: string | null;
  latitude: number;
  longitude: number;
  nightly_cost: number;
  nights: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Trip = {
  id: string;
  name: string;
  slug: string;
  currency: Currency;
  travelers_count: number;
  visibility: "private" | "unlisted" | "public";
  share_token: string | null;
  created_at: string;
  updated_at: string;
  stops: TripStop[];
};

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
