import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getOrgSubscription } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const org_id = new URL(request.url).searchParams.get('org_id');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });

    // Verify access
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', org_id)
      .single();
    if (!org) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const data = await getOrgSubscription(org_id);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
