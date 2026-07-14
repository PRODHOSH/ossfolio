import { NextResponse } from "next/server";

export function sanitizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  if (cleaned.length > 39) return null;
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(cleaned)) return null;
  if (/^[-]|[-]$/.test(cleaned)) return null;
  return cleaned;
}

export function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 2048);
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function validateYear(value: unknown): number | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}$/.test(value)) return null;
  const parsed = parseInt(value, 10);
  const now = new Date().getFullYear();
  if (parsed < now - 10 || parsed > now) return null;
  return parsed;
}

export function validatePagination(
  page: unknown,
  pageSize: unknown,
  maxPage = 100,
  maxSize = 100
): { page: number; pageSize: number } {
  const p = typeof page === "string" ? parseInt(page, 10) : typeof page === "number" ? page : 1;
  const s = typeof pageSize === "string" ? parseInt(pageSize, 10) : typeof pageSize === "number" ? pageSize : 20;
  return {
    page: Math.max(1, Math.min(maxPage, isNaN(p) ? 1 : p)),
    pageSize: Math.max(1, Math.min(maxSize, isNaN(s) ? 20 : s)),
  };
}

export function validateSortBy<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  if (typeof value !== "string") return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function createApiResponse<T>(data: T, status = 200, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...extraHeaders,
    },
  });
}

export function createErrorResponse(
  error: string,
  status = 400,
  extra?: Record<string, unknown>,
  headers?: Record<string, string>
): NextResponse {
  const body: Record<string, unknown> = {
    error,
    code: errorCodeForStatus(status),
    status,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  return NextResponse.json(body, {
    status,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      ...headers,
    },
  });
}


function errorCodeForStatus(status: number): string {
  switch (status) {
    case 400: return "VALIDATION_ERROR";
    case 401: return "AUTH_ERROR";
    case 404: return "NOT_FOUND";
    case 429: return "RATE_LIMITED";
    case 502: return "UPSTREAM_ERROR";
    case 503: return "SERVICE_UNAVAILABLE";
    default: return "INTERNAL_ERROR";
  }
}

export function apiErrorResponse(error: AppError, extraHeaders?: Record<string, string>): NextResponse {
  const body = toApiErrorBody(error);
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extraHeaders,
  };
  if (error.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(error.retryAfterSeconds);
  }
  return NextResponse.json(body, {
    status: error.status,
    headers,
  });
}
