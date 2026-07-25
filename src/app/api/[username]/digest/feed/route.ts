import { NextResponse } from "next/server";
import { getContributionDigest, generateDigestRssXml, DigestPeriod } from "@/lib/digest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period: DigestPeriod = periodParam === "monthly" ? "monthly" : "weekly";

  if (!username) {
    return new Response("Username is required", { status: 400 });
  }

  try {
    const digestData = await getContributionDigest(username, period);
    const xml = generateDigestRssXml(username, digestData);

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Failed to generate RSS digest feed:", error);
    return new Response("Failed to generate RSS feed", { status: 500 });
  }
}
