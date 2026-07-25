import { NextResponse } from "next/server";
import { refreshOrganizationStats } from "@/lib/org-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organization: string }> }
) {
  const { organization } = await params;

  if (!organization) {
    return NextResponse.json({ error: "Organization slug is required" }, { status: 400 });
  }

  try {
    const updatedData = await refreshOrganizationStats(organization);
    return NextResponse.json(updatedData);
  } catch (err) {
    console.error("Failed to refresh organization stats:", err);
    return NextResponse.json(
      { error: "Failed to refresh organization stats" },
      { status: 500 }
    );
  }
}
