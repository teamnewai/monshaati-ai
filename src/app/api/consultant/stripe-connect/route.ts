import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { consultant_id } = await request.json() as { consultant_id: string };

    // Verify this is the consultant's own profile
    const { data: profile } = await supabase
      .from('consultant_profiles')
      .select('id, user_id, stripe_account_id, stripe_onboarded, display_name')
      .eq('id', consultant_id)
      .eq('user_id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const p = profile as Record<string,unknown>;

    // If already onboarded, return dashboard link
    if (p.stripe_onboarded) {
      const loginLink = await (stripe as unknown as {
        accounts: { createLoginLink(id: string): Promise<{ url: string }> }
      }).accounts.createLoginLink(p.stripe_account_id as string);
      return NextResponse.json({ url: loginLink.url, already_connected: true });
    }

    // Create or retrieve Stripe Connect account
    let accountId = p.stripe_account_id as string | undefined;

    if (!accountId) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();
      const up = userProfile as Record<string,unknown> | null;

      const account = await (stripe as unknown as {
        accounts: {
          create(opts: Record<string,unknown>): Promise<{ id: string }>
        }
      }).accounts.create({
        type:         'express',
        country:      'SA',
        email:        up?.email as string ?? user.email ?? '',
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        business_profile: { name: p.display_name as string },
        metadata: { consultant_id, user_id: user.id },
      });

      accountId = account.id;
      await supabase.from('consultant_profiles').update({
        stripe_account_id: accountId,
      }).eq('id', consultant_id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // Create onboarding link
    const accountLink = await (stripe as unknown as {
      accountLinks: {
        create(opts: Record<string,unknown>): Promise<{ url: string }>
      }
    }).accountLinks.create({
      account:     accountId,
      refresh_url: `${appUrl}/consultants/dashboard?stripe_refresh=true`,
      return_url:  `${appUrl}/consultants/dashboard?stripe_success=true`,
      type:        'account_onboarding',
    });

    // Save onboard URL for reference
    await supabase.from('consultant_profiles').update({
      stripe_onboard_url: accountLink.url,
    }).eq('id', consultant_id);

    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

// Webhook callback: mark consultant as stripe_onboarded
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { consultant_id } = await request.json() as { consultant_id: string };

    const { data: profile } = await supabase
      .from('consultant_profiles')
      .select('id, stripe_account_id, user_id')
      .eq('id', consultant_id)
      .eq('user_id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const p = profile as Record<string,unknown>;

    // Verify account is actually fully onboarded
    if (p.stripe_account_id) {
      const account = await (stripe as unknown as {
        accounts: { retrieve(id: string): Promise<{ charges_enabled: boolean; payouts_enabled: boolean }> }
      }).accounts.retrieve(p.stripe_account_id as string);

      if (account.charges_enabled && account.payouts_enabled) {
        await supabase.from('consultant_profiles').update({
          stripe_onboarded: true,
          payout_enabled:   true,
        }).eq('id', consultant_id);
        return NextResponse.json({ onboarded: true });
      }
    }

    return NextResponse.json({ onboarded: false, message: 'Account not yet fully verified by Stripe' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
