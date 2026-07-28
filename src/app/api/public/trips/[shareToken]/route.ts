import { z } from "zod";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

const tokenSchema = z.string().min(32).max(100);
const publicTripFields =
  "id,name,slug,currency,travelers_count,visibility,created_at,updated_at";
const publicStopFields =
  "id,position,place_name,country,region,formatted_address,latitude,longitude,nightly_cost,nights,notes";
type Context = { params: Promise<{ shareToken: string }> };

export async function GET(request: Request, context: Context) {
  const limited = applyRateLimit(request, "public-trip", 120);
  if (limited) return limited;

  try {
    const shareToken = tokenSchema.parse((await context.params).shareToken);
    const admin = createAdminClient();
    const { data: trip, error } = await admin
      .from("trips")
      .select(publicTripFields)
      .eq("share_token", shareToken)
      .in("visibility", ["unlisted", "public"])
      .maybeSingle();

    if (error) throw new Error("Database query failed");
    if (!trip) return fail("NOT_FOUND", "Viagem não encontrada.", 404);

    const { data: stops, error: stopsError } = await admin
      .from("trip_stops")
      .select(publicStopFields)
      .eq("trip_id", trip.id)
      .order("position");
    if (stopsError) throw new Error("Database query failed");

    return ok({ ...trip, stops });
  } catch (error) {
    return handleApiError(error);
  }
}
