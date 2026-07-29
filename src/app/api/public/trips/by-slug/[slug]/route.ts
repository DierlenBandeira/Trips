import { z } from "zod";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { fail, handleApiError, ok } from "@/lib/api/response";
import { getPublicTripBySlug } from "@/lib/api/public-trip";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const tokenSchema = z.string().min(32).max(100).optional();
type Context = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: Context) {
  const limited = applyRateLimit(request, "public-trip-by-slug", 120);
  if (limited) return limited;

  try {
    const slug = slugSchema.parse((await context.params).slug);
    const authorization = request.headers.get("authorization");
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;
    const token = tokenSchema.parse(bearerToken);
    const trip = await getPublicTripBySlug(slug, token);
    return trip
      ? ok(trip)
      : fail("NOT_FOUND", "Viagem não encontrada.", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
