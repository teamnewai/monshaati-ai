import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'], uid: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', uid).single();
  if ((data as Record<string,unknown>)?.role !== 'super_admin') throw new Error('FORBIDDEN');
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    await requireAdmin(supabase, user.id);
    const url    = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const search = url.searchParams.get('q');
    const admin  = await createAdminSupabaseClient();

    let q = admin.from('consultant_profiles')
      .select('*, profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') q = q.eq('status', status);
    if (search)           q = q.ilike('display_name', '%' + search + '%');

    const { data, error, count } = await q.limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ consultants: data ?? [], total: count ?? 0 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'FORBIDDEN' ? 403 : msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
