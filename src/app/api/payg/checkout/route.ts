import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';
import type { PaygService } from '@/types/database';

const PAYG: Record<PaygService, { name_ar: string; price_cents: number }> = {
  org_chart:        { name_ar: 'الهيكل التنظيمي',     price_cents: 100 },
  job_descriptions: { name_ar: 'الأوصاف الوظيفية',    price_cents: 100 },
  policies:         { name_ar: 'السياسات',              price_cents: 200 },
  procedures:       { name_ar: 'الإجراءات',             price_cents: 200 },
  kpi_package:      { name_ar: 'مؤشرات الأداء KPI',   price_cents: 200 },
  hiring_plan:      { name_ar: 'خطة التوظيف',          price_cents: 200 },
  full_package:     { name_ar: 'الباقة الكاملة',       price_cents: 800 },
};

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { service, org_id } = await request.json() as { service: PaygService; org_id: string };

    const { data: org } = await supabase.from('organizations').select('owner_id').eq('id', org_id).single();
    if (!org || (org as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const item = PAYG[service];
    if (!item) return NextResponse.json({ error: 'Invalid service' }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: item.price_cents,
          product_data: { name: `منشأتي AI — ${item.name_ar}` },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/dashboard?payg_success=true&service=${service}`,
      cancel_url:  `${appUrl}/pricing`,
      metadata: { org_id, user_id: user.id, service, type: 'payg' },
    });

    await supabase.from('payg_purchases').insert({
      org_id, user_id: user.id, service,
      price_paid_usd: item.price_cents / 100,
      price_paid_sar: (item.price_cents / 100) * 3.75,
      stripe_session_id: session.id,
      status: 'pending',
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
