import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, LIMITS } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/supabase-server';
import { stripe, PLAN_PRICE_IDS } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    // Rate limit checkout
    const rl = rateLimit({ key: `checkout:${user.id}`, ...LIMITS.STRIPE_CHECKOUT });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'محاولات كثيرة. حاول لاحقاً.' }, { status: 429 });
    }
    const { plan, org_id } = await request.json() as { plan: string; org_id: string };

    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get or create Stripe customer
    let customerId: string | undefined;
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', org_id)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id as string;
    } else {
      // Get user profile for name/email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', org_id)
        .single();

      const customer = await stripe.customers.create({
        email:    profile?.email ?? user.email ?? '',
        name:     profile?.full_name ?? undefined,
        metadata: { org_id, user_id: user.id, org_name: (org as Record<string, unknown> | null)?.["name"] as string ?? '' },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer:    customerId,
      mode:        'subscription',
      line_items:  [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/pricing?canceled=true`,
      subscription_data: {
        metadata: { org_id, user_id: user.id },
        trial_period_days: plan === 'starter' ? 7 : undefined,
      },
      metadata: { org_id, user_id: user.id, plan },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
