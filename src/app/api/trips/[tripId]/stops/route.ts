import { z } from "zod";
import { createStopSchema } from "@/lib/api/schemas";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { requireTripEditor, stopFields } from "@/lib/api/trips";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();
type Context = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, context: Context) {
  const limited = applyRateLimit(request, "create-stop", 30);
  if (limited) return limited;

  try {
    const tripId = idSchema.parse((await context.params).tripId);
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const input = createStopSchema.parse(await request.json());
    const { data, error } = await createAdminClient()
      .from("trip_stops")
      .insert({
        trip_id: tripId,
        position: input.position,
        place_name: input.placeName,
        country: input.country,
        region: input.region,
        formatted_address: input.formattedAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        nightly_cost: input.nightlyCost,
        nights: input.nights,
        notes: input.notes,
      })
      .select(stopFields)
      .single();

    if (error?.code === "23505") {
      return fail("POSITION_CONFLICT", "Já existe uma parada nessa posição.", 409);
    }
    if (error) throw new Error("Database insert failed");
    return ok(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
