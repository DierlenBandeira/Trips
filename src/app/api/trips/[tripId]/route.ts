import { z } from "zod";
import { cookies } from "next/headers";
import { updateTripSchema } from "@/lib/api/schemas";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/lib/api/request";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { editCookieName, generateToken } from "@/lib/api/tokens";
import {
  getTripWithStops,
  requireTripEditor,
  tripFields,
} from "@/lib/api/trips";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

const idSchema = z.uuid();
type Context = { params: Promise<{ tripId: string }> };

export async function GET(request: Request, context: Context) {
  const limited = applyRateLimit(request, "get-trip");
  if (limited) return limited;

  try {
    const tripId = idSchema.parse((await context.params).tripId);
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const trip = await getTripWithStops(tripId);
    return trip ? ok(trip) : fail("NOT_FOUND", "Viagem não encontrada.", 404);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const limited = applyRateLimit(request, "update-trip", 30);
  if (limited) return limited;

  try {
    const tripId = idSchema.parse((await context.params).tripId);
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const input = updateTripSchema.parse(await readJsonBody(request));
    const admin = createAdminClient();
    const updates: Database["public"]["Tables"]["trips"]["Update"] = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.travelersCount !== undefined) updates.travelers_count = input.travelersCount;
    if (input.visibility !== undefined) {
      updates.visibility = input.visibility;
      if (input.visibility === "private") updates.share_token = null;
    }
    if (input.regenerateShareToken) {
      updates.share_token = generateToken();
    } else if (
      input.visibility !== undefined &&
      input.visibility !== "private"
    ) {
      const { data: current, error: currentError } = await admin
        .from("trips")
        .select("share_token")
        .eq("id", tripId)
        .maybeSingle();
      if (currentError) throw new Error("Database read failed");
      if (!current?.share_token) updates.share_token = generateToken();
    }

    const { data, error } = await admin
      .from("trips")
      .update(updates)
      .eq("id", tripId)
      .select(tripFields)
      .maybeSingle();

    if (error) throw new Error("Database update failed");
    return data ? ok(data) : fail("NOT_FOUND", "Viagem não encontrada.", 404);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const limited = applyRateLimit(request, "delete-trip", 10);
  if (limited) return limited;

  try {
    assertSameOrigin(request);
    const tripId = idSchema.parse((await context.params).tripId);
    if (!(await requireTripEditor(tripId))) {
      return fail("UNAUTHORIZED", "Acesso de edição inválido.", 401);
    }
    const { error, count } = await createAdminClient()
      .from("trips")
      .delete({ count: "exact" })
      .eq("id", tripId);
    if (error) throw new Error("Database delete failed");
    if (!count) return fail("NOT_FOUND", "Viagem não encontrada.", 404);
    (await cookies()).delete(editCookieName(tripId));
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
