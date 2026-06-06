import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { data } = await supabase.from('tenants')
      .select('stripe_customer_id, monthly_fee_usd, billing_cycle, total_revenue, revenue_this_month, stripe_sub_id, is_active, billing_email')
      .eq('id', id).eq('owner_id', user.id).single();
    if (!data) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ billing: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { action } = await request.json() as { action: 'subscribe' | 'portal' };
    const { data: tenant } = await supabase.from('tenants')
      .select('owner_id, name, slug, stripe_customer_id, billing_email').eq('id', id).single();
    if (!tenant || (tenant as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const t = tenant as Record<string,unknown>;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    if (action === 'portal' && t.stripe_customer_id) {
      const s = await stripe.billingPortal.sessions.create({ customer: t.stripe_customer_id as string, return_url: `${appUrl}/admin/tenants/${id}` });
      return NextResponse.json({ url: s.url });
    }
    let customerId = t.stripe_customer_id as string | undefined;
    if (!customerId) {
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
      const customer = await stripe.customers.create({ email: (t.billing_email ?? (profile as Record<string,unknown>)?.email ?? '') as string, name: t.name as string, metadata: { tenant_id: id } });
      customerId = customer.id;
      await supabase.from('tenants').update({ stripe_customer_id: customerId }).eq('id', id);
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId, mode: 'subscription',
      line_items: [{ price_data: { currency: 'usd', unit_amount: 29900, recurring: { interval: 'month' }, product_data: { name: `White Label — ${t.name}` } }, quantity: 1 }],
      success_url: `${appUrl}/admin/tenants/${id}?billing_success=true`,
      cancel_url: `${appUrl}/admin/tenants/${id}`,
      metadata: { tenant_id: id, type: 'white_label' },
    });
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
