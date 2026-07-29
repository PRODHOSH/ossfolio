import { createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { getContributionDigest, DigestPeriod } from "@/lib/digest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period: DigestPeriod = periodParam === "monthly" ? "monthly" : "weekly";

  if (!username) {
    return createErrorResponse("Username is required", 400);
  }

  try {
    const digestData = await getContributionDigest(username, period);
    return createApiResponse(digestData);
  } catch (error) {
    console.error("Failed to generate contribution digest:", error);
    return createErrorResponse("Failed to generate digest", 500);
  }
}
