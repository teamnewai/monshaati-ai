import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

async function isAdmin(user_id: string, supabase: Awaited<ReturnType<typeof import('@/lib/supabase-server').requireAuth>>['supabase']) {
  const { data } = await supabase.from('profiles').select('role').eq('id', user_id).single();
  return (data as Record<string,unknown>)?.role === 'super_admin';
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();
    if (!await isAdmin(user.id, supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const admin = await createAdminSupabaseClient();
    const { data } = await admin.from('coupons').select('*').order('created_at', { ascending: false });
    return NextResponse.json({ coupons: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    if (!await isAdmin(user.id, supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const admin = await createAdminSupabaseClient();
    const { data, error } = await admin.from('coupons').insert({ ...body, created_by: user.id }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
