import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';
import { rateLimit, LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const url    = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit  = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);

    let q = supabase
      .from('support_tickets')
      .select('*, ticket_messages(count), support_agents(name_ar, email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tickets: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    // Rate limit ticket creation
    const rl = rateLimit({ key: `support:ticket:${user.id}`, limit: 5, windowSecs: 3600 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'تجاوزت حد إنشاء التذاكر. حاول لاحقاً.' }, { status: 429 });
    }

    const { subject, description, category, priority, org_id, channel } = await request.json() as {
      subject: string; description: string; category?: string;
      priority?: string; org_id?: string; channel?: string;
    };

    if (!subject?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'العنوان والوصف مطلوبان' }, { status: 400 });
    }

    const admin = await createAdminSupabaseClient();
    const { data, error } = await admin.from('support_tickets').insert({
      user_id:     user.id,
      org_id:      org_id ?? null,
      subject:     subject.trim(),
      description: description.trim(),
      category:    category ?? null,
      priority:    priority ?? 'medium',
      channel:     channel ?? 'web',
      status:      'open',
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Add first system message
    await admin.from('ticket_messages').insert({
      ticket_id:   (data as Record<string,unknown>).id,
      sender_type: 'system',
      content:     `تم استلام تذكرتك رقم ${(data as Record<string,unknown>).ticket_number}. سيتواصل معك فريق الدعم قريباً.`,
    });

    return NextResponse.json({ ticket: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { ticket_id, satisfaction_score, status } = await request.json() as {
      ticket_id: string; satisfaction_score?: number; status?: string;
    };

    const updates: Record<string,unknown> = {};
    if (satisfaction_score !== undefined) updates.satisfaction_score = satisfaction_score;
    if (status === 'closed') { updates.status = 'closed'; updates.closed_at = new Date().toISOString(); }

    const { data, error } = await supabase.from('support_tickets')
      .update(updates)
      .eq('id', ticket_id)
      .eq('user_id', user.id)
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ticket: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
