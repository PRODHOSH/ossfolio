import { NextResponse } from "next/server";
import { sanitizeString } from "../sanitizer";

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

export function validateEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
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

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  schema: Record<string, { type: "string" | "number" | "boolean" | "array" | "object"; maxLength?: number; required?: boolean }>
): { data: Partial<T>; errors: string[] } {
  const data: Partial<T> = {};
  const errors: string[] = [];

  for (const [key, rule] of Object.entries(schema)) {
    const value = obj[key as keyof T];
    if (value === undefined || value === null) {
      if (rule.required) errors.push(`${key} is required`);
      continue;
    }
    if (rule.type === "string" && typeof value === "string") {
      data[key as keyof T] = sanitizeString(value, rule.maxLength ?? 500) as T[keyof T];
    } else if (rule.type === "number" && typeof value === "number") {
      data[key as keyof T] = value;
    } else if (rule.type === "boolean" && typeof value === "boolean") {
      data[key as keyof T] = value;
    } else if (rule.type === "array" && Array.isArray(value)) {
      data[key as keyof T] = value.slice(0, rule.maxLength ?? 50) as T[keyof T];
    } else if (rule.type === "object" && typeof value === "object" && !Array.isArray(value)) {
      data[key as keyof T] = value;
    } else {
      errors.push(`${key} has invalid type`);
    }
  }

  return { data, errors };
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

export function createErrorResponse(error: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { error, ...extra },
    {
      status,
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    }
  );
}

export const COMMON_SCHEMAS = {
  pagination: {
    page: { type: "number" as const },
    pageSize: { type: "number" as const },
  },
  profile: {
    headline: { type: "string" as const, maxLength: 160 },
    bio: { type: "string" as const, maxLength: 500 },
    location: { type: "string" as const, maxLength: 100 },
  },
};
