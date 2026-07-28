export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string;
          name: string;
          slug: string;
          currency: string;
          travelers_count: number;
          visibility: string;
          share_token: string | null;
          edit_token_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          currency?: string;
          travelers_count?: number;
          visibility?: string;
          share_token?: string | null;
          edit_token_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          currency?: string;
          travelers_count?: number;
          visibility?: string;
          share_token?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      trip_stops: {
        Row: {
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
        Insert: {
          id?: string;
          trip_id: string;
          position: number;
          place_name: string;
          country?: string | null;
          region?: string | null;
          formatted_address?: string | null;
          latitude: number;
          longitude: number;
          nightly_cost?: number;
          nights?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          position?: number;
          place_name?: string;
          country?: string | null;
          region?: string | null;
          formatted_address?: string | null;
          latitude?: number;
          longitude?: number;
          nightly_cost?: number;
          nights?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      trip_route_cache: {
        Row: {
          id: string;
          trip_id: string;
          stops_hash: string;
          route_geometry: Json;
          route_distance_meters: number | null;
          route_provider: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          stops_hash: string;
          route_geometry: Json;
          route_distance_meters?: number | null;
          route_provider: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stops_hash?: string;
          route_geometry?: Json;
          route_distance_meters?: number | null;
          route_provider?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      reorder_trip_stops: {
        Args: { p_trip_id: string; p_stop_ids: string[] };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
