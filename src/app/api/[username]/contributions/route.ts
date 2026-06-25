import { NextRequest, NextResponse } from "next/server";
import { fetchContributionCalendar } from "@/lib/github";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const year = request.nextUrl.searchParams.get("year");

  let from: string | undefined;
  if (year !== null) {
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }
    const parsed = parseInt(year, 10);
    const now = new Date().getFullYear();
    if (parsed < now - 10 || parsed > now) {
      return NextResponse.json({ error: "Year out of range" }, { status: 400 });
    }
    from = `${year}-01-01`;
  }
  const calendar = await fetchContributionCalendar(username, from);

  if (!calendar) {
    return NextResponse.json(
      { error: "Failed to fetch contribution data" },
      { status: 502 }
    );
  }

  return NextResponse.json(calendar, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}
