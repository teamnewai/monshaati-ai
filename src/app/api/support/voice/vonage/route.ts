import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

// Vonage webhook — call status events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string,unknown>;
    const uuid   = body.uuid as string;
    const status = body.status as string;
    const duration = body.duration as string | undefined;

    const admin = await createAdminSupabaseClient();

    const statusMap: Record<string, string> = {
      'ringing':    'queued',
      'answered':   'in_progress',
      'completed':  'completed',
      'busy':       'missed',
      'failed':     'failed',
      'rejected':   'missed',
      'unanswered': 'missed',
    };

    await admin.from('support_calls')
      .update({
        status:          statusMap[status] ?? 'queued',
        duration_secs:   duration ? parseInt(duration) : null,
        ended_at:        status === 'completed' ? new Date().toISOString() : undefined,
      })
      .eq('provider_call_id', uuid)
      .eq('provider', 'vonage');

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[vonage webhook]', err);
    return NextResponse.json({ ok: false });
  }
}

// Initiate Vonage call
export async function PUT(request: NextRequest) {
  try {
    const { call_id, to_phone } = await request.json() as { call_id: string; to_phone: string };

    const apiKey    = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    const fromPhone = process.env.VONAGE_PHONE_NUMBER;
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://monshaati.ai';

    if (!apiKey || !apiSecret || !fromPhone) {
      return NextResponse.json({ error: 'Vonage not configured' }, { status: 503 });
    }

    const res = await fetch('https://rest.nexmo.com/call/json', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:        [{ type: 'phone', number: to_phone }],
        from:      { type: 'phone', number: fromPhone },
        ncco:      [{ action: 'talk', text: 'مرحباً من منشأتي AI. يرجى الانتظار.' }],
        event_url: [`${appUrl}/api/support/voice/vonage`],
      }),
    });

    const data = await res.json() as Record<string,unknown>;
    if (!res.ok) return NextResponse.json({ error: data.error_title ?? 'Vonage error' }, { status: 500 });

    const admin = await createAdminSupabaseClient();
    await admin.from('support_calls').update({
      provider_call_id: data.uuid as string,
      status: 'queued',
    }).eq('id', call_id);

    return NextResponse.json({ uuid: data.uuid });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
