import { NextResponse } from "next/server";
import { claimOrganization } from "@/lib/org-data";
import { supabase } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organization: string }> }
) {
  const { organization } = await params;

  if (!organization) {
    return NextResponse.json({ error: "Organization slug is required" }, { status: 400 });
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
      return NextResponse.json(
        { error: "Authentication required to claim an organization" },
        { status: 401 }
      );
    }

    const success = await claimOrganization(organization, userId);

    if (success) {
      return NextResponse.json({ success: true, message: "Organization claimed successfully" });
    }

    return NextResponse.json(
      { error: "Organization is already claimed or could not be updated" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error in claim organization endpoint:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
