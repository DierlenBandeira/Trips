import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { editCookieName, tokenMatches } from "@/lib/api/tokens";

export const tripFields =
  "id,name,slug,currency,travelers_count,visibility,share_token,created_at,updated_at";
export const stopFields =
  "id,trip_id,position,place_name,country,region,formatted_address,latitude,longitude,nightly_cost,nights,notes,created_at,updated_at";

export async function requireTripEditor(tripId: string) {
  const token = (await cookies()).get(editCookieName(tripId))?.value;
  if (!token) return false;

  const { data, error } = await createAdminClient()
    .from("trips")
    .select("edit_token_hash")
    .eq("id", tripId)
    .maybeSingle();

  if (error || !data) return false;
  return tokenMatches(token, data.edit_token_hash);
}

export async function getTripWithStops(tripId: string) {
  const admin = createAdminClient();
  const [tripResult, stopsResult] = await Promise.all([
    admin.from("trips").select(tripFields).eq("id", tripId).maybeSingle(),
    admin
      .from("trip_stops")
      .select(stopFields)
      .eq("trip_id", tripId)
      .order("position"),
  ]);

  if (tripResult.error || stopsResult.error) throw new Error("Database query failed");
  if (!tripResult.data) return null;
  return { ...tripResult.data, stops: stopsResult.data };
}
