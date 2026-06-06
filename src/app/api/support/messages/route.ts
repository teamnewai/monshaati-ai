import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const ticket_id = new URL(request.url).searchParams.get('ticket_id');
    if (!ticket_id) return NextResponse.json({ error: 'ticket_id required' }, { status: 400 });

    // Verify ownership
    const { data: ticket } = await supabase
      .from('support_tickets').select('id').eq('id', ticket_id).eq('user_id', user.id).single();
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket_id)
      .eq('is_internal', false)
      .order('created_at');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { ticket_id, content } = await request.json() as { ticket_id: string; content: string };

    if (!content?.trim()) return NextResponse.json({ error: 'المحتوى مطلوب' }, { status: 400 });

    // Verify ticket ownership
    const { data: ticket } = await supabase
      .from('support_tickets').select('id, status').eq('id', ticket_id).eq('user_id', user.id).single();
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const t = ticket as Record<string,unknown>;
    if (t.status === 'closed') return NextResponse.json({ error: 'التذكرة مغلقة' }, { status: 400 });

    const admin = await createAdminSupabaseClient();
    const { data, error } = await admin.from('ticket_messages').insert({
      ticket_id,
      sender_id:   user.id,
      sender_type: 'user',
      content:     content.trim(),
    }).select().single();

    // Reopen if resolved/waiting
    if (['resolved','waiting'].includes(t.status as string)) {
      await admin.from('support_tickets').update({ status: 'in_progress' }).eq('id', ticket_id);
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
