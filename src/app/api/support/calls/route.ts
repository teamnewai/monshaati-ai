import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { data, error } = await supabase
      .from('support_calls')
      .select('*, support_agents(name_ar, email, phone)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ calls: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    // Rate limit callback requests
    const rl = rateLimit({ key: `support:call:${user.id}`, limit: 3, windowSecs: 3600 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'تجاوزت حد الطلبات. حاول بعد ساعة.' }, { status: 429 });
    }

    const { caller_phone, direction, scheduled_at, ticket_id, provider } = await request.json() as {
      caller_phone?: string;
      direction?: string;
      scheduled_at?: string;
      ticket_id?: string;
      provider?: string;
    };

    const admin = await createAdminSupabaseClient();

    // Find available agent
    const { data: agent } = await admin
      .from('support_agents')
      .select('id, phone')
      .eq('is_active', true)
      .eq('status', 'available')
      .order('current_load')
      .limit(1)
      .maybeSingle();

    const { data, error } = await admin.from('support_calls').insert({
      user_id:      user.id,
      ticket_id:    ticket_id ?? null,
      agent_id:     (agent as Record<string,unknown> | null)?.id ?? null,
      caller_phone: caller_phone ?? null,
      direction:    direction ?? 'callback',
      provider:     provider ?? 'twilio',
      status:       scheduled_at ? 'queued' : 'requested',
      scheduled_at: scheduled_at ?? null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // In production: trigger Twilio/Vonage call here
    // await initiateCall(data, agent);

    return NextResponse.json({
      call:    data,
      agent:   agent,
      message: scheduled_at
        ? 'تم جدولة المكالمة. سيتصل بك أحد المختصين في الوقت المحدد.'
        : 'تم استلام طلبك. سيتصل بك أحد المختصين قريباً خلال 5-10 دقائق.',
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
