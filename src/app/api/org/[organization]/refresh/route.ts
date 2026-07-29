import { createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { refreshOrganizationStats } from "@/lib/org-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organization: string }> }
) {
  const { organization } = await params;

  if (!organization) {
    return createErrorResponse("Organization slug is required", 400);
  }

  try {
    const updatedData = await refreshOrganizationStats(organization);
    return createApiResponse(updatedData);
  } catch (err) {
    console.error("Failed to refresh organization stats:", err);
    return createErrorResponse("Failed to refresh organization stats", 500);
  }
}
