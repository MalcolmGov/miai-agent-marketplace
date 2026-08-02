import { NextResponse } from "next/server";

export function correlationFromHeaders(headers: Headers): string | undefined {
  const id =
    headers.get("x-correlation-id")?.trim() ||
    headers.get("x-request-id")?.trim();
  return id || undefined;
}

type ApiErrorOpts = {
  detail?: unknown;
  headers?: HeadersInit;
  correlationId?: string;
};

export function apiError(
  status: number,
  error: string,
  detail?: unknown,
  headers?: HeadersInit,
): NextResponse;
export function apiError(
  status: number,
  error: string,
  opts?: ApiErrorOpts,
): NextResponse;
export function apiError(
  status: number,
  error: string,
  detailOrOpts?: unknown | ApiErrorOpts,
  headers?: HeadersInit,
): NextResponse {
  let detail: unknown;
  let hdrs: HeadersInit | undefined;
  let correlationId: string | undefined;

  if (detailOrOpts && typeof detailOrOpts === "object" && !Array.isArray(detailOrOpts)) {
    const opts = detailOrOpts as ApiErrorOpts;
    detail = opts.detail;
    hdrs = opts.headers;
    correlationId = opts.correlationId;
  } else {
    detail = detailOrOpts;
    hdrs = headers;
  }

  const body: Record<string, unknown> = { error };
  if (detail !== undefined) body.detail = detail;
  if (correlationId) body.correlationId = correlationId;
  return NextResponse.json(body, { status, headers: hdrs });
}

export function apiOk(body: unknown, status = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json(body, { status, headers });
}

export function apiErrorFromRequest(
  req: Request,
  status: number,
  error: string,
  detail?: unknown,
  headers?: HeadersInit,
): NextResponse {
  return apiError(status, error, {
    detail,
    headers,
    correlationId: correlationFromHeaders(req.headers),
  });
}
