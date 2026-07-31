import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi";

/**
 * Serves the OpenAPI 3.1 description of the public read API.
 *
 * Generated per request from the schemas in lib/openapi.ts rather than checked
 * in as a static file, so it cannot drift from them — which is the failure mode
 * the issue names under "Alternatives Considered".
 *
 * CORS is open because the document is public by definition and integrators
 * fetch it from their own tooling.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildOpenApiDocument(), {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
