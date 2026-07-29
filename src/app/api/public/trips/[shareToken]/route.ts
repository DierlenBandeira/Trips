import { z } from "zod";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { getPublicTripByToken } from "@/lib/api/public-trip";

const tokenSchema = z.string().min(32).max(100);
type Context = { params: Promise<{ shareToken: string }> };

export async function GET(request: Request, context: Context) {
  const limited = applyRateLimit(request, "public-trip", 120);
  if (limited) return limited;

  try {
    const shareToken = tokenSchema.parse((await context.params).shareToken);
    const trip = await getPublicTripByToken(shareToken);
    if (!trip) return fail("NOT_FOUND", "Viagem não encontrada.", 404);
    return ok(trip);
  } catch (error) {
    return handleApiError(error);
  }
}
