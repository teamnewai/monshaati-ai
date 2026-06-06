import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { topic, start_time, duration, attendee_email } = await request.json() as {
      topic: string; start_time: string; duration: number; attendee_email: string;
    };

    const clientId     = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;

    // Get access token via refresh
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    });
    const { access_token } = await tokenRes.json() as { access_token: string };

    const start = new Date(start_time);
    const end   = new Date(start.getTime() + duration * 60000);

    // Create Google Calendar event with Meet link
    const eventRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary:     topic,
          start:       { dateTime: start.toISOString(), timeZone: 'Asia/Riyadh' },
          end:         { dateTime: end.toISOString(),   timeZone: 'Asia/Riyadh' },
          attendees:   [{ email: attendee_email }],
          conferenceData: {
            createRequest: { requestId: `monshaati-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
          },
          reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 30 }, { method: 'popup', minutes: 10 }] },
        }),
      }
    );

    const event = await eventRes.json() as {
      id: string;
      htmlLink: string;
      conferenceData?: { entryPoints?: { uri: string }[] };
    };

    const meetUrl = event.conferenceData?.entryPoints?.[0]?.uri ?? '';

    return NextResponse.json({
      event_id:     event.id,
      meeting_url:  meetUrl,
      calendar_url: event.htmlLink,
      meeting_type: 'google_meet',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Google Meet error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
