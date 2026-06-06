import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

async function requireSuperAdmin(supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'], user_id: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', user_id).single();
  if ((data as Record<string,unknown>)?.role !== 'super_admin') throw new Error('FORBIDDEN');
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    await requireSuperAdmin(supabase, user.id);
    const url = new URL(request.url);
    const search = url.searchParams.get('q');
    const status = url.searchParams.get('status'); // active, suspended, all
    const admin  = await createAdminSupabaseClient();

    let q = admin.from('tenants').select('*, profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    if (status === 'active')    q = q.eq('is_active', true).is('suspended_at', null);
    if (status === 'suspended') q = q.not('suspended_at', 'is', null);

    const { data, error, count } = await q.limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tenants: data ?? [], total: count ?? 0 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    await requireSuperAdmin(supabase, user.id);
    const { id, action, reason } = await request.json() as { id: string; action: string; reason?: string };
    const admin = await createAdminSupabaseClient();

    if (action === 'suspend') {
      await admin.from('tenants').update({ is_active: false, suspended_at: new Date().toISOString(), suspension_reason: reason ?? 'Suspended by admin' }).eq('id', id);
    } else if (action === 'activate') {
      await admin.from('tenants').update({ is_active: true, suspended_at: null, suspension_reason: null }).eq('id', id);
    } else if (action === 'set_plan') {
      // admin override for plan limits
    }

    await admin.from('tenant_activity').insert({ tenant_id: id, actor_id: user.id, action: `admin_${action}`, metadata: { reason, by: user.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'FORBIDDEN' ? 403 : 500 });
  }
}
