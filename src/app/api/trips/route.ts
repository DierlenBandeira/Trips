import { NextResponse } from "next/server";
import { createTripSchema } from "@/lib/api/schemas";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { readJsonBody } from "@/lib/api/request";
import { fail, handleApiError, ok } from "@/lib/api/response";
import {
  EDIT_COOKIE_MAX_AGE,
  editCookieName,
  generateToken,
  hashToken,
} from "@/lib/api/tokens";
import { tripFields } from "@/lib/api/trips";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const limited = applyRateLimit(request, "create-trip", 5, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const input = createTripSchema.parse(await readJsonBody(request));
    const editToken = generateToken();
    const shareToken = input.visibility === "private" ? null : generateToken();

    const { data, error } = await createAdminClient()
      .from("trips")
      .insert({
        name: input.name,
        slug: input.slug,
        currency: input.currency,
        travelers_count: input.travelersCount,
        visibility: input.visibility,
        share_token: shareToken,
        edit_token_hash: hashToken(editToken),
      })
      .select(tripFields)
      .single();

    if (error) {
      if (error.code === "23505") {
        return fail("SLUG_CONFLICT", "Esse identificador de viagem já está em uso.", 409);
      }
      throw new Error("Database insert failed");
    }

    const response = ok(data, 201);
    response.cookies.set(editCookieName(data.id), editToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/api/trips/${data.id}`,
      maxAge: EDIT_COOKIE_MAX_AGE,
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export function GET() {
  return NextResponse.json(
    { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Método não permitido." } },
    { status: 405, headers: { Allow: "POST" } },
  );
}
