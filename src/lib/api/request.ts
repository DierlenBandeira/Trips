export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const DEFAULT_MAX_BODY_BYTES = 16 * 1024;

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestUrl = new URL(request.url);
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProtocol =
    request.headers.get("x-forwarded-proto") || requestUrl.protocol.slice(0, -1);
  const allowedOrigins = new Set([requestUrl.origin]);

  if (forwardedHost) {
    allowedOrigins.add(`${forwardedProtocol}://${forwardedHost}`);
  }

  if (
    (origin && !allowedOrigins.has(origin)) ||
    fetchSite === "cross-site"
  ) {
    throw new ApiRequestError(
      "CROSS_ORIGIN_REQUEST",
      "Origem da requisição não permitida.",
      403,
    );
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
) {
  assertSameOrigin(request);

  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) {
    throw new ApiRequestError(
      "UNSUPPORTED_MEDIA_TYPE",
      "O corpo deve usar application/json.",
      415,
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiRequestError(
      "PAYLOAD_TOO_LARGE",
      "O corpo da requisição excede o limite permitido.",
      413,
    );
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new ApiRequestError(
      "PAYLOAD_TOO_LARGE",
      "O corpo da requisição excede o limite permitido.",
      413,
    );
  }

  return JSON.parse(body) as unknown;
}
