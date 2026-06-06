import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const org_id = new URL(request.url).searchParams.get('org_id');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });
    const { data } = await supabase.from('payg_purchases').select('*')
      .eq('org_id', org_id).order('purchased_at', { ascending: false });
    return NextResponse.json({ purchases: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
