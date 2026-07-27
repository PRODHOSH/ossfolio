import { NextRequest } from "next/server";
import { createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { processDeadLetterQueue } from "@/lib/webhook-dead-letter";

export async function POST(request: NextRequest) {
  // Simple administrative authorization check via header or service role token
  const authHeader = request.headers.get("authorization");
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GITHUB_WEBHOOK_SECRET;

  if (secretKey && authHeader !== `Bearer ${secretKey}`) {
    return createErrorResponse("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const batchSizeParam = searchParams.get("batchSize");
  const batchSize = batchSizeParam ? parseInt(batchSizeParam, 10) : 10;

  const result = await processDeadLetterQueue(
    isNaN(batchSize) ? 10 : batchSize,
  );

  return createApiResponse({
    ok: true,
    stats: result,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
