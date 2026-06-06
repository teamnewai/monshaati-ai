import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { createAdminSupabaseClient } from '@/lib/supabase-server';
import { sendPaymentSuccessEmail, sendBookingConfirmationEmail } from '@/lib/email';
import type Stripe from 'stripe';

// Disable body parsing — Stripe needs raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body      = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    console.error('[webhook] Invalid signature:', msg);
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  const admin = await createAdminSupabaseClient();

  try {
    switch (event.type) {

      // ── Checkout completed → subscriptions + PAYG + bookings ─
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession;
        const sessionMeta = session.metadata ?? {};

        // Handle PAYG
        if (sessionMeta.type === 'payg') {
          await admin.from('payg_purchases').update({ status: 'completed' })
            .eq('stripe_session_id', session.id);
          await admin.from('revenue_events').insert({
            event_type: 'payg', org_id: sessionMeta.org_id ?? null,
            user_id: sessionMeta.user_id ?? null,
            amount_usd: (session.amount_total ?? 0) / 100,
            stripe_id: session.id, metadata: { service: sessionMeta.service ?? '' },
          });
          break;
        }

        // Handle marketplace purchase
        if (sessionMeta.type === 'marketplace') {
          await admin.from('product_purchases').update({ status: 'completed' })
            .eq('stripe_session_id', session.id);
          await admin.from('revenue_events').insert({
            event_type: 'marketplace', org_id: sessionMeta.org_id ?? null,
            user_id: sessionMeta.buyer_id ?? null,
            amount_usd: (session.amount_total ?? 0) / 100,
            stripe_id: session.id, metadata: { product_id: sessionMeta.product_id ?? '' },
          });
          break;
        }

        // Handle booking payment
        if (sessionMeta.type === 'booking') {
          const bookingUpd = await admin.from('consultant_bookings')
            .update({ status: 'confirmed' }).eq('stripe_session_id', session.id)
            .select('id, duration, scheduled_at').single();
          if (bookingUpd.data) {
            const bk = bookingUpd.data as Record<string,unknown>;
            try {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
              const zRes = await fetch(`${appUrl}/api/zoom`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: 'جلسة استشارية — منشأتي AI', start_time: bk.scheduled_at, duration: bk.duration === '30min' ? 30 : 60, booking_id: bk.id }),
              });
              if (zRes.ok) {
                const zm = await zRes.json() as Record<string,unknown>;
                await admin.from('consultant_bookings').update({
                  meeting_url: zm.join_url, zoom_join_url: zm.join_url,
                  zoom_start_url: zm.start_url, meeting_type: 'zoom',
                }).eq('id', bk.id as string);
              }
            } catch { /* zoom optional */ }
          }
          // Send booking confirmation email
          try {
            const { data: clientProf } = await admin.from('profiles').select('full_name, email').eq('id', sessionMeta.user_id ?? '').single();
            const { data: consultProf } = await admin.from('consultant_profiles').select('display_name_ar').eq('id', sessionMeta.consultant_id ?? '').single();
            if (clientProf) {
              const cp = clientProf as Record<string,unknown>;
              const cons = consultProf as Record<string,unknown> | null;
              await sendBookingConfirmationEmail({
                to: cp.email as string,
                name: (cp.full_name as string | null) ?? 'عزيزي',
                consultant_name: (cons?.display_name_ar as string | null) ?? 'المستشار',
                duration: (sessionMeta.duration as string | undefined) ?? '60min',
                scheduled_at: (sessionMeta.scheduled_at as string | undefined) ?? new Date().toISOString(),
                meeting_url: undefined,
                price_sar: (session.amount_total ?? 0) / 100 * 3.75,
              });
            }
          } catch { /* email optional */ }
          await admin.from('revenue_events').insert({
            event_type: 'consultation', org_id: sessionMeta.org_id ?? null,
            user_id: sessionMeta.user_id ?? null,
            amount_usd: (session.amount_total ?? 0) / 100,
            stripe_id: session.id,
          });
          break;
        }

        // Subscription mode
        if (session.mode !== 'subscription') break;

        const org_id  = session.metadata?.org_id;
        const user_id = session.metadata?.user_id;
        if (!org_id || !user_id) break;

        const stripeSubId = session.subscription as string;
        const stripeSub   = await stripe.subscriptions.retrieve(stripeSubId);
        const priceId     = stripeSub.items.data[0]?.price.id ?? '';
        const plan        = getPlanFromPriceId(priceId);

        await upsertSubscription(admin, {
          org_id,
          user_id,
          stripe_customer_id:     session.customer as string,
          stripe_subscription_id: stripeSubId,
          stripe_price_id:        priceId,
          plan,
          status:                 stripeSub.status,
          current_period_start:   new Date((stripeSub.current_period_start as unknown as number) * 1000).toISOString(),
          current_period_end:     new Date((stripeSub.current_period_end as unknown as number) * 1000).toISOString(),
          trial_end:              stripeSub.trial_end
            ? new Date((stripeSub.trial_end as unknown as number) * 1000).toISOString()
            : null,
        });

        // Update org subscription_plan
        await admin.from('organizations').update({ subscription_plan: plan })
          .eq('id', org_id);

        break;
      }

      // ── Subscription updated ─────────────────────────────────
      case 'customer.subscription.updated': {
        const sub   = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        if (!orgId) break;

        const priceId = sub.items.data[0]?.price.id ?? '';
        const plan    = getPlanFromPriceId(priceId);

        await admin.from('subscriptions').update({
          plan,
          status:               sub.status,
          stripe_price_id:      priceId,
          current_period_start: new Date((sub.current_period_start as unknown as number) * 1000).toISOString(),
          current_period_end:   new Date((sub.current_period_end as unknown as number) * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at:          sub.canceled_at
            ? new Date((sub.canceled_at as unknown as number) * 1000).toISOString()
            : null,
        }).eq('stripe_subscription_id', sub.id);

        // Send payment success email
        try {
          const subAny = sub as unknown as Record<string,unknown>;
          const tenantOrgId = subAny?.metadata ? (subAny.metadata as Record<string,unknown>)?.org_id as string | undefined : undefined;
          const profileUserId = tenantOrgId ? (await admin.from('organizations').select('owner_id').eq('id', tenantOrgId).single()).data : null;
          const ownerIdStr = (profileUserId as Record<string,unknown> | null)?.owner_id as string | undefined;
          if (ownerIdStr) {
            const { data: prof } = await admin.from('profiles').select('full_name, email').eq('id', ownerIdStr).single();
            if (prof) {
              const p = prof as Record<string,unknown>;
              await sendPaymentSuccessEmail({
                to:         p.email as string,
                name:       (p.full_name as string | null) ?? 'عزيزي',
                plan,
                amount_sar: 0,
                period_end: new Date().toISOString(),
              });
            }
          }
        } catch { /* email optional */ }
        // Keep org in sync
        await admin.from('organizations').update({ subscription_plan: plan })
          .eq('id', orgId);

        break;
      }

      // ── Subscription deleted / canceled ─────────────────────
      case 'customer.subscription.deleted': {
        const sub   = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        if (!orgId) break;

        await admin.from('subscriptions').update({
          status:     'canceled',
          canceled_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id);

        await admin.from('organizations').update({ subscription_plan: 'free_trial' })
          .eq('id', orgId);

        break;
      }

      // ── Invoice paid → save invoice record ──────────────────
      case 'invoice.paid': {
        const inv   = event.data.object as Stripe.Invoice;
        const orgId = (inv.subscription_details?.metadata?.org_id ?? inv.metadata?.org_id) as string | undefined;
        if (!orgId) break;

        const { data: sub } = await admin.from('subscriptions')
          .select('id')
          .eq('stripe_customer_id', inv.customer as string)
          .maybeSingle();

        await admin.from('invoices').upsert({
          org_id:                 orgId,
          subscription_id:        sub?.id ?? null,
          stripe_invoice_id:      inv.id,
          stripe_payment_intent:  inv.payment_intent as string ?? null,
          amount_paid:            inv.amount_paid,
          amount_due:             inv.amount_due,
          currency:               inv.currency,
          status:                 'paid',
          invoice_pdf:            inv.invoice_pdf ?? null,
          hosted_invoice_url:     inv.hosted_invoice_url ?? null,
          period_start:           inv.period_start ? new Date((inv.period_start as unknown as number) * 1000).toISOString() : null,
          period_end:             inv.period_end   ? new Date((inv.period_end   as unknown as number) * 1000).toISOString() : null,
          paid_at:                new Date().toISOString(),
        }, { onConflict: 'stripe_invoice_id' });

        break;
      }

      // ── Invoice payment failed ────────────────────────────────
      case 'invoice.payment_failed': {
        const inv   = event.data.object as Stripe.Invoice;
        const orgId = (inv.subscription_details?.metadata?.org_id ?? inv.metadata?.org_id) as string | undefined;
        if (!orgId) break;

        await admin.from('subscriptions').update({ status: 'past_due' })
          .eq('stripe_customer_id', inv.customer as string);

        break;
      }

      // ── Payment intent events (optional logging) ─────────────
      case 'payment_intent.payment_failed': {
        console.warn('[webhook] payment_intent.payment_failed:', event.id);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('[webhook] Handler error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// ── Helper ────────────────────────────────────────────────────
async function upsertSubscription(
  admin: Awaited<ReturnType<typeof createAdminSupabaseClient>>,
  data: Record<string, unknown>
) {
  const existing = await admin.from('subscriptions')
    .select('id')
    .eq('org_id', data.org_id as string)
    .maybeSingle();

  if (existing.data) {
    await admin.from('subscriptions').update(data).eq('org_id', data.org_id as string);
  } else {
    await admin.from('subscriptions').insert(data);
  }
}
