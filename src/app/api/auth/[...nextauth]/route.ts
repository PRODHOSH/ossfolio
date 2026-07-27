import { NextResponse } from "next/server";

// Runtime managed by @opennextjs/cloudflare

export function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
