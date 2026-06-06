import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';

const DURATIONS: Record<string, { label: string; price_usd: number }> = {
  '30min': { label: '30 دقيقة', price_usd: 15 },
  '60min': { label: '60 دقيقة', price_usd: 25 },
};

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const role = new URL(request.url).searchParams.get('role') ?? 'client';
    let q = supabase.from('consultant_bookings').select('*, consultant_profiles(display_name, avatar_url), profiles(full_name)').order('scheduled_at', { ascending: false });
    if (role === 'consultant') {
      const { data: cp } = await supabase.from('consultant_profiles').select('id').eq('user_id', user.id).single();
      if (cp) q = q.eq('consultant_id', (cp as Record<string,unknown>).id as string);
    } else {
      q = q.eq('client_user_id', user.id);
    }
    const { data } = await q;
    return NextResponse.json({ bookings: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { consultant_id, duration, scheduled_at, org_id, notes } = await request.json() as {
      consultant_id: string; duration: string; scheduled_at: string; org_id: string; notes?: string;
    };

    const dur = DURATIONS[duration];
    if (!dur) return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });

    const { data: consultant } = await supabase.from('consultant_profiles')
      .select('display_name, price_30min_usd, price_60min_usd').eq('id', consultant_id).eq('status','active').single();
    if (!consultant) return NextResponse.json({ error: 'Consultant not found' }, { status: 404 });

    const price = duration === '30min'
      ? (consultant as Record<string,unknown>).price_30min_usd as number
      : (consultant as Record<string,unknown>).price_60min_usd as number;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(price * 100),
          product_data: { name: `جلسة استشارية — ${(consultant as Record<string,unknown>).display_name} (${dur.label})` },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/bookings?success=true`,
      cancel_url:  `${appUrl}/consultants/${consultant_id}`,
      metadata: { consultant_id, duration, scheduled_at, org_id, user_id: user.id, type: 'booking' },
    });

    const { data: booking } = await supabase.from('consultant_bookings').insert({
      consultant_id, client_org_id: org_id, client_user_id: user.id,
      duration, scheduled_at, status: 'pending',
      price_usd: price, price_sar: price * 3.75,
      stripe_session_id: session.id,
      notes: notes ?? null,
    }).select().single();

    return NextResponse.json({ url: session.url, booking_id: (booking as Record<string,unknown>)?.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
