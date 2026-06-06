import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

// Twilio webhook — called when call status changes
export async function POST(request: NextRequest) {
  try {
    const rawBody  = await request.text();
    const params   = new URLSearchParams(rawBody);
    const callSid  = params.get('CallSid') ?? '';
    const status   = params.get('CallStatus') ?? '';
    const duration = params.get('CallDuration') ?? '';
    const recordingUrl = params.get('RecordingUrl');

    const admin = await createAdminSupabaseClient();

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      'ringing':    'queued',
      'in-progress':'in_progress',
      'completed':  'completed',
      'busy':       'missed',
      'failed':     'failed',
      'no-answer':  'missed',
    };
    const mappedStatus = statusMap[status] ?? 'queued';

    await admin.from('support_calls')
      .update({
        status:         mappedStatus,
        provider_call_id: callSid,
        duration_secs:  duration ? parseInt(duration) : null,
        recording_url:  recordingUrl ?? null,
        started_at:     status === 'in-progress' ? new Date().toISOString() : undefined,
        ended_at:       status === 'completed' ? new Date().toISOString() : undefined,
      })
      .eq('provider_call_id', callSid)
      .eq('provider', 'twilio');

    // Twilio expects TwiML response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (err: unknown) {
    console.error('[twilio webhook]', err);
    return new Response('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

// Initiate outbound call via Twilio
export async function PUT(request: NextRequest) {
  try {
    const { call_id, to_phone } = await request.json() as { call_id: string; to_phone: string };

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone  = process.env.TWILIO_PHONE_NUMBER;
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://monshaati.ai';

    if (!accountSid || !authToken || !fromPhone) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 });
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const params = new URLSearchParams({
      To:     to_phone,
      From:   fromPhone,
      Url:    `${appUrl}/api/support/voice/twilio/twiml`,
      StatusCallback: `${appUrl}/api/support/voice/twilio`,
      StatusCallbackMethod: 'POST',
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method:  'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params,
      }
    );

    const data = await res.json() as Record<string,unknown>;
    if (!res.ok) return NextResponse.json({ error: data.message ?? 'Twilio error' }, { status: 500 });

    const admin = await createAdminSupabaseClient();
    await admin.from('support_calls').update({
      provider_call_id: data.sid as string,
      status: 'queued',
      started_at: new Date().toISOString(),
    }).eq('id', call_id);

    return NextResponse.json({ call_sid: data.sid });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
