import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { data: ownership } = await supabase.from('tenants').select('owner_id').eq('id', id).single();
    if (!ownership || (ownership as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase.from('tenant_members')
      .select('*, profiles(id, full_name, email, role)')
      .eq('tenant_id', id).eq('is_active', true).order('created_at');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ members: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { email, role = 'member' } = await request.json() as { email: string; role?: string };

    // Verify ownership
    const { data: t } = await supabase.from('tenants').select('owner_id, name').eq('id', id).single();
    if (!t || (t as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Find user by email
    const { data: profile } = await supabase.from('profiles').select('id, email').eq('email', email).maybeSingle();
    if (!profile) return NextResponse.json({ error: 'User not found. They must register first.' }, { status: 404 });

    const { data, error } = await supabase.from('tenant_members').insert({
      tenant_id:   id,
      user_id:     (profile as Record<string,unknown>).id,
      role,
      invited_by:  user.id,
      invited_at:  new Date().toISOString(),
      accepted_at: new Date().toISOString(), // auto-accept for now
    }).select('*, profiles(full_name, email)').single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'User already a member' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('tenant_activity').insert({
      tenant_id: id, actor_id: user.id,
      action: 'member_invited', metadata: { email, role },
    });

    return NextResponse.json({ member: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { member_id } = await request.json() as { member_id: string };

    const { data: t } = await supabase.from('tenants').select('owner_id').eq('id', id).single();
    if (!t || (t as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await supabase.from('tenant_members').update({ is_active: false }).eq('id', member_id).eq('tenant_id', id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
