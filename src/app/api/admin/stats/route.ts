import { NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = await createAdminSupabaseClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: total_orgs },
      { count: total_users },
      { count: total_generations },
      { count: generations_today },
      { data: recent_gens },
    ] = await Promise.all([
      admin.from('organizations').select('*', { count: 'exact', head: true }),
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('ai_generations').select('*', { count: 'exact', head: true }),
      admin.from('ai_generations').select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      admin.from('ai_generations')
        .select('generation_time_ms')
        .eq('status', 'completed')
        .not('generation_time_ms', 'is', null)
        .limit(100),
    ]);

    const avg_gen_time_ms = recent_gens?.length
      ? Math.round(
          recent_gens.reduce((s: number, g: Record<string, unknown>) => s + ((g.generation_time_ms as number) ?? 0), 0) / recent_gens.length
        )
      : null;

    return NextResponse.json({
      total_orgs:        total_orgs ?? 0,
      total_users:       total_users ?? 0,
      total_generations: total_generations ?? 0,
      generations_today: generations_today ?? 0,
      avg_gen_time_ms,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
