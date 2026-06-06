import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const consultant_id = new URL(request.url).searchParams.get('consultant_id');
    if (!consultant_id) return NextResponse.json({ error: 'Missing consultant_id' }, { status: 400 });
    const { data } = await supabase.from('consultant_availability')
      .select('*').eq('consultant_id', consultant_id).eq('is_active', true).order('day_of_week');
    return NextResponse.json({ availability: data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await request.json() as Record<string, unknown>;
    const { data: profile } = await supabase.from('consultant_profiles').select('id').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Not a consultant' }, { status: 403 });
    await supabase.from('consultant_availability').delete().eq('consultant_id', (profile as Record<string,unknown>).id as string);
    const slots = (body.slots as Record<string, unknown>[]) ?? [];
    if (slots.length) {
      await supabase.from('consultant_availability').insert(
        slots.map(s => ({ ...s, consultant_id: (profile as Record<string,unknown>).id }))
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
