import { NextResponse } from 'next/server';

let subscriptions: any[] = [];

export async function POST(request: Request) {
  try {
    const sub = await request.json();
    subscriptions.push(sub);
    return NextResponse.json({ success: true, count: subscriptions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ subscriptions_count: subscriptions.length });
}
