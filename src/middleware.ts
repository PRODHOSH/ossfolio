import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { recordProfileView } from "@/lib/analytics-tracker";

const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://avatars.githubusercontent.com",
    "https://github.com",
  ],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'", "https://api.github.com", "https://github.com"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
};

function cspToString(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": cspToString(CSP_DIRECTIVES),
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

const API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, If-None-Match, Cache-Control",
  "Access-Control-Max-Age": "86400",
};

const SYSTEM_ROUTES = new Set([
  "",
  "api",
  "auth",
  "discover",
  "settings",
  "compare",
  "offline",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "og-image.png",
]);

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/sw.js" ||
    pathname.startsWith("/manifest")
  ) {
    return NextResponse.next();
  }

  // Non-blocking anonymous profile view tracking for GET /[username]
  if (request.method === "GET") {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 1 && !SYSTEM_ROUTES.has(parts[0].toLowerCase())) {
      const username = parts[0];
      const referrerHeader = request.headers.get("referer");
      const visitorIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("cf-connecting-ip");
      const countryHeader =
        request.headers.get("cf-ipcountry") ||
        request.headers.get("x-vercel-ip-country");
      const cityHeader =
        request.headers.get("cf-ipcity") ||
        request.headers.get("x-vercel-ip-city");
      const userAgent = request.headers.get("user-agent");

      // Record view asynchronously using event.waitUntil to prevent premature termination
      event.waitUntil(
        recordProfileView({
          username,
          referrerHeader,
          visitorIp,
          countryHeader,
          cityHeader,
          userAgent,
        }).catch((err) =>
          console.error("Async middleware view tracking error:", err)
        )
      );
    }
  }

  const response = NextResponse.next();

  // Apply security headers to all responses.
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Apply CORS headers for API routes.
  if (pathname.startsWith("/api/")) {
    for (const [key, value] of Object.entries(API_CORS_HEADERS)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
