import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const url      = new URL(request.url);
    const category = url.searchParams.get('category');
    const search   = url.searchParams.get('q');
    const is_free  = url.searchParams.get('free') === 'true';
    const page     = Number(url.searchParams.get('page') ?? '1');
    const limit    = 12;

    let q = supabase.from('marketplace_products')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('downloads_count', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (category) q = q.eq('category', category);
    if (is_free)  q = q.eq('is_free', true);
    if (search)   q = q.or(`title_ar.ilike.%${search}%,title_en.ilike.%${search}%`);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: data ?? [], total: count ?? 0, page, limit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await request.json() as Record<string, unknown>;
    const { data, error } = await supabase.from('marketplace_products')
      .insert({ ...body, seller_id: user.id, status: 'draft' })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
