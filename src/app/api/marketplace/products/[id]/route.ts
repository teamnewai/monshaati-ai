import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const [{ data: product }, { data: reviews }] = await Promise.all([
      supabase.from('marketplace_products').select('*, profiles(full_name)').eq('id', id).eq('status','published').single(),
      supabase.from('product_reviews').select('*, profiles(full_name)').eq('product_id', id).order('created_at', { ascending: false }).limit(10),
    ]);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product, reviews: reviews ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
