import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

// Zoom OAuth token (set in env)
async function getZoomToken(): Promise<string> {
  const clientId     = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;
  const accountId    = process.env.ZOOM_ACCOUNT_ID!;

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
    }
  );
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { topic, start_time, duration, booking_id } = await request.json() as {
      topic: string; start_time: string; duration: number; booking_id: string;
    };

    const token = await getZoomToken();
    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled
        start_time,
        duration,
        timezone: 'Asia/Riyadh',
        settings: {
          host_video: true,
          participant_video: true,
          waiting_room: true,
          auto_recording: 'none',
        },
      }),
    });

    const meeting = await res.json() as {
      id: string; password: string;
      join_url: string; start_url: string;
    };

    return NextResponse.json({
      meeting_id:   meeting.id,
      password:     meeting.password,
      join_url:     meeting.join_url,
      start_url:    meeting.start_url,
      meeting_type: 'zoom',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Zoom error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
