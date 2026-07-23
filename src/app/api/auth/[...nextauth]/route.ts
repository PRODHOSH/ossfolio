import { NextResponse } from 'next/server';

export const runtime = 'edge';

export function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
