import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { data: tenant } = await supabase.from('tenants')
      .select('owner_id, orgs_count, users_count, gens_this_month, revenue_this_month, total_revenue, created_at')
      .eq('id', id).single();
    if (!tenant || (tenant as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const t = tenant as Record<string,unknown>;
    const { data: orgs } = await supabase.from('organizations')
      .select('id, name, created_at, subscription_plan').eq('tenant_id', id)
      .order('created_at', { ascending: false });
    const { data: activity } = await supabase.from('tenant_activity')
      .select('action, created_at, metadata').eq('tenant_id', id)
      .order('created_at', { ascending: false }).limit(20);
    const { data: statsHistory } = await supabase.from('tenant_stats')
      .select('*').eq('tenant_id', id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }).limit(12);
    const now = new Date();
    const newOrgsThisMonth = (orgs ?? []).filter((o: Record<string,unknown>) => {
      const d = new Date(o.created_at as string);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    // Calculate actual gens from usage_tracking
    const now2 = new Date();
    const monthStart2 = new Date(now2.getFullYear(), now2.getMonth(), 1).toISOString();
    const { data: usageData } = await supabase.from('usage_tracking')
      .select('generations_used')
      .in('org_id', (orgs ?? []).map((o: Record<string,unknown>) => o.id as string))
      .gte('period_start', monthStart2);
    const actualGensThisMonth = (usageData ?? []).reduce((s: number, u: Record<string,unknown>) => s + ((u.generations_used as number) ?? 0), 0);
    await supabase.from('tenants').update({ gens_this_month: actualGensThisMonth }).eq('id', id);

    return NextResponse.json({
      overview: {
        total_orgs: t.orgs_count, total_users: t.users_count,
        gens_this_month: actualGensThisMonth,
        revenue_this_month: t.revenue_this_month, total_revenue: t.total_revenue,
        member_since: t.created_at, new_orgs_this_month: newOrgsThisMonth,
      },
      orgs: orgs ?? [], activity: activity ?? [], stats_history: statsHistory ?? [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
