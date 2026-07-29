import { createErrorResponse } from "@/lib/validators/api";

// Runtime managed by @opennextjs/cloudflare

export function GET() {
  return createErrorResponse("Not found", 404);
}

export function POST() {
  return createErrorResponse("Not found", 404);
}
