import { NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if ((profile as Record<string,unknown>)?.role !== 'super_admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = await createAdminSupabaseClient();
    const now   = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { data: subs },
      { data: paygPurchases },
      { data: bookings },
      { data: mpPurchases },
      { data: allSubs },
    ] = await Promise.all([
      admin.from('subscriptions').select('plan, status').eq('status', 'active'),
      admin.from('payg_purchases').select('price_paid_usd, purchased_at').eq('status', 'completed'),
      admin.from('consultant_bookings').select('price_usd, status, created_at').eq('status', 'completed'),
      admin.from('product_purchases').select('price_paid_usd, purchased_at').eq('status', 'completed'),
      admin.from('subscriptions').select('plan, status, created_at').order('created_at'),
    ]);

    const PLAN_PRICE: Record<string, number> = { starter: 99/3.75, business: 299/3.75, professional: 799/3.75 };

    const subRevenue  = (subs ?? []).reduce((s: number, sub: Record<string,unknown>) => s + (PLAN_PRICE[sub.plan as string] ?? 0), 0);
    const paygRevenue = (paygPurchases ?? []).reduce((s: number, p: Record<string,unknown>) => s + ((p.price_paid_usd as number) ?? 0), 0);
    const consRevenue = (bookings ?? []).reduce((s: number, b: Record<string,unknown>) => s + ((b.price_usd as number) ?? 0), 0);
    const mpRevenue   = (mpPurchases ?? []).reduce((s: number, p: Record<string,unknown>) => s + ((p.price_paid_usd as number) ?? 0), 0);

    const monthlyPayg = (paygPurchases ?? [])
      .filter((p: Record<string,unknown>) => new Date(p.purchased_at as string) >= new Date(monthStart))
      .reduce((s: number, p: Record<string,unknown>) => s + ((p.price_paid_usd as number) ?? 0), 0);

    return NextResponse.json({
      summary: {
        total_revenue_usd:   subRevenue + paygRevenue + consRevenue + mpRevenue,
        subscription_revenue: subRevenue,
        payg_revenue:         paygRevenue,
        consultation_revenue: consRevenue,
        marketplace_revenue:  mpRevenue,
        active_subscriptions: (subs ?? []).length,
        this_month_payg:      monthlyPayg,
      },
      plan_breakdown: {
        starter:      (allSubs ?? []).filter((s: Record<string,unknown>) => s.plan === 'starter'      && s.status === 'active').length,
        business:     (allSubs ?? []).filter((s: Record<string,unknown>) => s.plan === 'business'     && s.status === 'active').length,
        professional: (allSubs ?? []).filter((s: Record<string,unknown>) => s.plan === 'professional' && s.status === 'active').length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
