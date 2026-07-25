import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const digestData = await getContributionDigest(username, period);
    return NextResponse.json(digestData);
  } catch (error) {
    console.error("Failed to generate contribution digest:", error);
    return NextResponse.json(
      { error: "Failed to generate digest" },
      { status: 500 }
    );
  }
}
