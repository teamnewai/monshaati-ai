import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const org_id = new URL(request.url).searchParams.get('org_id');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });

    // Verify access
    const { data: org } = await supabase
      .from('organizations').select('id').eq('id', org_id).single();
    if (!org) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })
      .limit(24);

    return NextResponse.json({ invoices: invoices ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
