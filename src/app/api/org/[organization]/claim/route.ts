import { createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { claimOrganization } from "@/lib/org-data";
import { supabase } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organization: string }> }
) {
  const { organization } = await params;

  if (!organization) {
    return createErrorResponse("Organization slug is required", 400);
  }

  // Check auth user session
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      // Fallback: Check standard session
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id || null;
    }

    if (!userId) {
      return createErrorResponse(
        "Authentication required to claim an organization",
        401
      );
    }

    const success = await claimOrganization(organization, userId);

    if (success) {
      return createApiResponse({ message: "Organization claimed successfully" });
    }

    return createErrorResponse(
      "Organization is already claimed or could not be updated",
      400
    );
  } catch (err) {
    console.error("Error in claim organization endpoint:", err);
    return createErrorResponse("Internal server error", 500);
  }
}
