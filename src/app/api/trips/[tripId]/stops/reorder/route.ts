import { z } from "zod";
import { reorderStopsSchema } from "@/lib/api/schemas";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { readJsonBody } from "@/lib/api/request";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { requireTripEditor, stopFields } from "@/lib/api/trips";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();
type Context = { params: Promise<{ tripId: string }> };

export async function PUT(request: Request, context: Context) {
  const limited = applyRateLimit(request, "reorder-stops", 30);
  if (limited) return limited;

  try {
    const tripId = idSchema.parse((await context.params).tripId);
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const { stopIds } = reorderStopsSchema.parse(await readJsonBody(request));
    const admin = createAdminClient();
    const { error } = await admin.rpc("reorder_trip_stops", {
      p_trip_id: tripId,
      p_stop_ids: stopIds,
    });
    if (error) {
      return fail("INVALID_STOP_SET", "A lista de paradas não corresponde à viagem.", 400);
    }
    const { data, error: readError } = await admin
      .from("trip_stops")
      .select(stopFields)
      .eq("trip_id", tripId)
      .order("position");
    if (readError) throw new Error("Database read failed");
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
