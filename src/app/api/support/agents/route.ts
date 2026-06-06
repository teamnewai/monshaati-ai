import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET(_request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from('support_agents')
      .select('id, name_ar, status, avg_rating, specializations')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agents: data ?? [], available: (data ?? []).filter((a: Record<string,unknown>) => a.status === 'available').length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if ((profile as Record<string,unknown>)?.role !== 'super_admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { agent_id, status, notes, call_quality } = await request.json() as {
      agent_id: string; status?: string; notes?: string; call_quality?: number;
    };

    const admin = await createAdminSupabaseClient();
    const { data, error } = await admin.from('support_agents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', agent_id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agent: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
