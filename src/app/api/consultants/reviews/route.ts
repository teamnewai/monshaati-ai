import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { booking_id, rating, title, body } = await request.json() as {
      booking_id: string; rating: number; title?: string; body?: string;
    };
    const { data: booking } = await supabase.from('consultant_bookings')
      .select('id, consultant_id, client_user_id, status').eq('id', booking_id).single();
    if (!booking || (booking as Record<string,unknown>).client_user_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if ((booking as Record<string,unknown>).status !== 'completed')
      return NextResponse.json({ error: 'Can only review completed sessions' }, { status: 400 });
    const { data, error } = await supabase.from('consultant_reviews').insert({
      booking_id, consultant_id: (booking as Record<string,unknown>).consultant_id,
      reviewer_id: user.id, rating, title, body,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ review: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
