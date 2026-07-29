import { z } from "zod";
import { upsertTripLegSchema } from "@/lib/api/schemas";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/lib/api/request";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { legFields, requireTripEditor } from "@/lib/api/trips";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();
type Context = { params: Promise<{ tripId: string }> };

export async function PUT(request: Request, context: Context) {
  const limited = applyRateLimit(request, "upsert-trip-leg", 60);
  if (limited) return limited;

  try {
    const tripId = idSchema.parse((await context.params).tripId);
    assertSameOrigin(request);
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const input = upsertTripLegSchema.parse(await readJsonBody(request));
    const admin = createAdminClient();
    const { data: stops, error: stopError } = await admin
      .from("trip_stops")
      .select("id,position")
      .eq("trip_id", tripId)
      .in("id", [input.fromStopId, input.toStopId]);
    if (stopError) throw new Error("Database read failed");
    const fromStop = stops.find((stop) => stop.id === input.fromStopId);
    const toStop = stops.find((stop) => stop.id === input.toStopId);
    if (!fromStop || !toStop || toStop.position !== fromStop.position + 1) {
      return fail("INVALID_LEG", "As paradas do trecho não são válidas.", 400);
    }

    const { data, error } = await admin
      .from("trip_legs")
      .upsert(
        {
          trip_id: tripId,
          from_stop_id: input.fromStopId,
          to_stop_id: input.toStopId,
          transport_mode: input.transportMode,
          transport_cost:
            input.transportMode === "flight" ? input.transportCost : 0,
        },
        { onConflict: "trip_id,from_stop_id,to_stop_id" },
      )
      .select(legFields)
      .single();
    if (error) throw new Error("Database upsert failed");
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
