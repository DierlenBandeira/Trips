import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiRequestError } from "@/lib/api/request";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status, headers: privateHeaders });
}

export function fail(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: privateHeaders },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiRequestError) {
    return fail(error.code, error.message, error.status);
  }

  if (error instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Os dados enviados são inválidos.", 400);
  }

  if (error instanceof SyntaxError) {
    return fail("INVALID_JSON", "O corpo da requisição não é JSON válido.", 400);
  }

  console.error("API request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return fail("INTERNAL_ERROR", "Não foi possível concluir a operação.", 500);
}
