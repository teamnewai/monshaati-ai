import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const [{ data: consultant }, { data: reviews }, { data: availability }] = await Promise.all([
      supabase.from('consultant_profiles').select('*, profiles(full_name, email)').eq('id', id).eq('status','active').single(),
      supabase.from('consultant_reviews').select('*, profiles(full_name)').eq('consultant_id', id).eq('is_public', true).order('created_at', { ascending: false }).limit(10),
      supabase.from('consultant_availability').select('*').eq('consultant_id', id).eq('is_active', true).order('day_of_week'),
    ]);
    if (!consultant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ consultant, reviews: reviews ?? [], availability: availability ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const { data: existing } = await supabase.from('consultant_profiles').select('user_id').eq('id', id).single();
    if (!existing || (existing as Record<string,unknown>).user_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { data, error } = await supabase.from('consultant_profiles').update(body).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ consultant: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
