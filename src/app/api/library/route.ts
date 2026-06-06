import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase  = await createServerSupabaseClient();
    const url       = new URL(request.url);
    const type      = url.searchParams.get('type');
    const sector    = url.searchParams.get('sector');
    const search    = url.searchParams.get('q');
    const featured  = url.searchParams.get('featured') === 'true';
    const page      = Number(url.searchParams.get('page') ?? '1');
    const limit     = 20;

    let q = supabase.from('saudi_library')
      .select('*', { count: 'exact' })
      .order('is_featured', { ascending: false })
      .order('downloads_count', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (type)     q = q.eq('type', type);
    if (sector)   q = q.eq('sector', sector);
    if (featured) q = q.eq('is_featured', true);
    if (search)   q = q.ilike('title_ar', `%${search}%`);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [], total: count ?? 0, page, limit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
