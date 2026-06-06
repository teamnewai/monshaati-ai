import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

async function verifyOwnership(supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'], id: string, user_id: string) {
  const { data } = await supabase.from('tenants').select('owner_id').eq('id', id).single();
  return data && (data as Record<string,unknown>).owner_id === user_id;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;

    const { data, error } = await supabase.from('tenants')
      .select(`*, tenant_members(id, user_id, role, accepted_at, profiles(full_name, email))`)
      .eq('id', id).single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const owner = (data as Record<string,unknown>).owner_id === user.id;
    if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({ tenant: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    if (!await verifyOwnership(supabase, id, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json() as Record<string, unknown>;
    const allowed = [
      'name', 'name_ar', 'description_ar', 'tagline_ar', 'app_name_ar', 'app_name_en',
      'support_email', 'support_phone', 'billing_email', 'notes',
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const k of allowed) { if (k in body) updates[k] = body[k]; }

    const { data, error } = await supabase.from('tenants').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('tenant_activity').insert({ tenant_id: id, actor_id: user.id, action: 'tenant_updated', metadata: updates });
    return NextResponse.json({ tenant: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    if (!await verifyOwnership(supabase, id, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // First remove org associations
    await supabase.from('organizations').update({ tenant_id: null }).eq('tenant_id', id);
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
