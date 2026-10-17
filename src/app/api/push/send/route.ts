import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { title, body, url } = await request.json();

    // Broadcast message payload structure
    const payload = {
      title: title || '🔔 Hindu Subscription Portal',
      body: body || 'New renewal reminder alert.',
      url: url || '/renewals',
    };

    return NextResponse.json({
      success: true,
      message: 'Push notification triggered successfully',
      payload,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
