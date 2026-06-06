import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const org_id = new URL(request.url).searchParams.get('org_id');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });

    const { data, error } = await supabase
      .from('consultant_conversations')
      .select('*')
      .eq('org_id', org_id)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ conversations: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { org_id, topic, disclaimer_accepted } = await request.json() as {
      org_id: string; topic?: string; disclaimer_accepted?: boolean;
    };

    // Verify org ownership
    const { data: org } = await supabase.from('organizations').select('owner_id').eq('id', org_id).single();
    if (!org || (org as Record<string, unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase.from('consultant_conversations').insert({
      org_id,
      user_id:              user.id,
      topic:                topic ?? null,
      status:               'active',
      disclaimer_accepted:  disclaimer_accepted ?? false,
      disclaimer_accepted_at: disclaimer_accepted ? new Date().toISOString() : null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { conversation_id, status, satisfaction_score, disclaimer_accepted } = await request.json() as {
      conversation_id: string; status?: string;
      satisfaction_score?: number; disclaimer_accepted?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (status !== undefined)               updates.status = status;
    if (satisfaction_score !== undefined)   updates.satisfaction_score = satisfaction_score;
    if (disclaimer_accepted !== undefined) {
      updates.disclaimer_accepted    = disclaimer_accepted;
      updates.disclaimer_accepted_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from('consultant_conversations')
      .update(updates)
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ conversation: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
