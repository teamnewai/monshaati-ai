import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAuth();
    const { id } = await params;
    const { data, error } = await supabase.from('consultant_bookings')
      .select('*, consultant_profiles(display_name, avatar_url, price_30min_usd, price_60min_usd)')
      .eq('id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ booking: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const { data: booking } = await supabase.from('consultant_bookings')
      .select('client_user_id, consultant_id').eq('id', id).single();
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { data: cp } = await supabase.from('consultant_profiles').select('user_id').eq('id', (booking as Record<string,unknown>).consultant_id as string).single();
    const isConsultant = cp && (cp as Record<string,unknown>).user_id === user.id;
    const isClient     = (booking as Record<string,unknown>).client_user_id === user.id;
    if (!isConsultant && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { data, error } = await supabase.from('consultant_bookings').update(body).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booking: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
