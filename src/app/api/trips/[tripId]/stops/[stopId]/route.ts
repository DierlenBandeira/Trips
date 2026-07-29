import { z } from "zod";
import { updateStopSchema } from "@/lib/api/schemas";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/lib/api/request";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { requireTripEditor, stopFields } from "@/lib/api/trips";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

const idSchema = z.uuid();
type Context = { params: Promise<{ tripId: string; stopId: string }> };

export async function PATCH(request: Request, context: Context) {
  const limited = applyRateLimit(request, "update-stop", 60);
  if (limited) return limited;

  try {
    const params = await context.params;
    const tripId = idSchema.parse(params.tripId);
    const stopId = idSchema.parse(params.stopId);
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const input = updateStopSchema.parse(await readJsonBody(request));
    const updates: Database["public"]["Tables"]["trip_stops"]["Update"] = {};
    if (input.placeName !== undefined) updates.place_name = input.placeName;
    if (input.country !== undefined) updates.country = input.country;
    if (input.region !== undefined) updates.region = input.region;
    if (input.formattedAddress !== undefined) updates.formatted_address = input.formattedAddress;
    if (input.latitude !== undefined) updates.latitude = input.latitude;
    if (input.longitude !== undefined) updates.longitude = input.longitude;
    if (input.nightlyCost !== undefined) updates.nightly_cost = input.nightlyCost;
    if (input.nights !== undefined) updates.nights = input.nights;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { data, error } = await createAdminClient()
      .from("trip_stops")
      .update(updates)
      .eq("id", stopId)
      .eq("trip_id", tripId)
      .select(stopFields)
      .maybeSingle();
    if (error) throw new Error("Database update failed");
    return data ? ok(data) : fail("NOT_FOUND", "Parada não encontrada.", 404);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const limited = applyRateLimit(request, "delete-stop", 30);
  if (limited) return limited;

  try {
    assertSameOrigin(request);
    const params = await context.params;
    const tripId = idSchema.parse(params.tripId);
    const stopId = idSchema.parse(params.stopId);
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const { error, count } = await createAdminClient()
      .from("trip_stops")
      .delete({ count: "exact" })
      .eq("id", stopId)
      .eq("trip_id", tripId);
    if (error) throw new Error("Database delete failed");
    return count ? ok({ deleted: true }) : fail("NOT_FOUND", "Parada não encontrada.", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
