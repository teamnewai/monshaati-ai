import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';
import { getTrialStatus, expireTrial } from '@/lib/trial';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const org_id = new URL(request.url).searchParams.get('org_id');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });
    const { data: org } = await supabase.from('organizations').select('id').eq('id', org_id).single();
    if (!org) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const trial = await getTrialStatus(org_id);
    return NextResponse.json({ trial });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const { action, org_id } = await request.json() as { action: string; org_id: string };
    const { data: org } = await supabase.from('organizations').select('owner_id').eq('id', org_id).single();
    if (!org || (org as Record<string,unknown>).owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (action === 'expire') { await expireTrial(org_id); return NextResponse.json({ success: true }); }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
