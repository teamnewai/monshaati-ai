import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const url  = new URL(request.url);
    const cid  = url.searchParams.get('consultant_id');

    // Find own profile if not specified
    let consultantId = cid;
    if (!consultantId) {
      const { data: p } = await supabase.from('consultant_profiles').select('id').eq('user_id', user.id).single();
      consultantId = (p as Record<string,unknown>)?.id as string | undefined ?? null;
    }
    if (!consultantId) return NextResponse.json({ error: 'Not a consultant' }, { status: 404 });

    const { data: profile } = await supabase.from('consultant_profiles')
      .select('total_earnings_usd, pending_payout_usd, total_payouts_usd, stripe_onboarded, payout_enabled, platform_commission_pct, stripe_account_id')
      .eq('id', consultantId).single();
    const { data: payouts } = await supabase.from('consultant_payouts')
      .select('*').eq('consultant_id', consultantId).order('created_at', { ascending: false }).limit(24);
    const { data: bookings } = await supabase.from('consultant_bookings')
      .select('id, price_usd, platform_fee_usd, scheduled_at, status, duration')
      .eq('consultant_id', consultantId).order('scheduled_at', { ascending: false }).limit(30);

    const p = profile as Record<string,unknown> | null;
    const commission = Number(p?.platform_commission_pct ?? 20);

    // Group bookings by month for chart
    const monthlyData: Record<string, number> = {};
    for (const b of (bookings ?? []) as Record<string,unknown>[]) {
      if (b.status !== 'completed') continue;
      const month = new Date(b.scheduled_at as string).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      const net = Number(b.price_usd ?? 0) * (1 - commission / 100);
      monthlyData[month] = (monthlyData[month] ?? 0) + net;
    }

    return NextResponse.json({
      summary: {
        total_earned:    p?.total_earnings_usd ?? 0,
        pending_payout:  p?.pending_payout_usd ?? 0,
        total_paid_out:  p?.total_payouts_usd ?? 0,
        commission_pct:  commission,
        stripe_onboarded: p?.stripe_onboarded ?? false,
        payout_enabled:   p?.payout_enabled ?? false,
      },
      payouts:      payouts ?? [],
      bookings:     bookings ?? [],
      monthly_data: monthlyData,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

// Admin: create payout transfer
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if ((adminProfile as Record<string,unknown>)?.role !== 'super_admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { consultant_id, amount_usd, period_start, period_end, bookings_count } = await request.json() as {
      consultant_id: string; amount_usd: number;
      period_start: string; period_end: string; bookings_count: number;
    };

    const admin = await createAdminSupabaseClient();
    const { data: consult } = await admin.from('consultant_profiles')
      .select('stripe_account_id, stripe_onboarded, payout_enabled, platform_commission_pct')
      .eq('id', consultant_id).single();

    const c = consult as Record<string,unknown> | null;
    if (!c?.stripe_onboarded || !c?.payout_enabled)
      return NextResponse.json({ error: 'Consultant not Stripe-onboarded' }, { status: 400 });

    const commission = Number(c.platform_commission_pct ?? 20);
    const platformFee = amount_usd * (commission / 100);
    const netAmount   = amount_usd - platformFee;

    // Create Stripe transfer to consultant's Connect account
    let stripeTransferId: string | undefined;
    try {
      const transfer = await (stripe as unknown as {
        transfers: {
          create(opts: Record<string,unknown>): Promise<{ id: string }>
        }
      }).transfers.create({
        amount:      Math.round(netAmount * 100), // cents
        currency:    'usd',
        destination: c.stripe_account_id as string,
        metadata:    { consultant_id, period_start, period_end },
      });
      stripeTransferId = transfer.id;
    } catch (stripeErr: unknown) {
      console.error('Stripe transfer error:', stripeErr);
    }

    // Record payout
    const { data: payout, error } = await admin.from('consultant_payouts').insert({
      consultant_id,
      amount_usd,
      platform_fee_usd:  platformFee,
      net_amount_usd:    netAmount,
      stripe_transfer_id: stripeTransferId ?? null,
      status:            stripeTransferId ? 'processing' : 'pending',
      period_start,
      period_end,
      bookings_count,
      paid_at:           stripeTransferId ? new Date().toISOString() : null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update pending amount
    await admin.from('consultant_profiles').update({
      pending_payout_usd: 0,
      total_payouts_usd:  (c.total_payouts_usd as number ?? 0) + netAmount,
    }).eq('id', consultant_id);

    return NextResponse.json({ payout, stripe_transfer_id: stripeTransferId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Payout error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
