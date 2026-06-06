import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { data } = await supabase.from('product_purchases')
      .select('*, marketplace_products(title_ar, category, file_format, cover_image_url)')
      .eq('buyer_id', user.id)
      .order('purchased_at', { ascending: false });
    return NextResponse.json({ purchases: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { product_id, org_id } = await request.json() as { product_id: string; org_id?: string };

    const { data: product } = await supabase.from('marketplace_products')
      .select('title_ar, price_usd, is_free').eq('id', product_id).eq('status','published').single();
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    if ((product as Record<string,unknown>).is_free) {
      const { data: purchase } = await supabase.from('product_purchases').insert({
        product_id, buyer_id: user.id, buyer_org_id: org_id ?? null,
        price_paid_usd: 0, status: 'completed',
      }).select().single();
      return NextResponse.json({ purchase, download_url: null });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round((product as Record<string,unknown>).price_usd as number * 100),
          product_data: { name: `منشأتي Marketplace — ${(product as Record<string,unknown>).title_ar}` },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/marketplace?purchase_success=true`,
      cancel_url:  `${appUrl}/marketplace/${product_id}`,
      metadata: { product_id, buyer_id: user.id, org_id: org_id ?? '', type: 'marketplace' },
    });

    await supabase.from('product_purchases').insert({
      product_id, buyer_id: user.id, buyer_org_id: org_id ?? null,
      price_paid_usd: (product as Record<string,unknown>).price_usd as number,
      stripe_session_id: session.id, status: 'pending',
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
