import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await request.json() as Record<string, unknown>;

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        owner_id:           user.id,
        name:               body.name,
        name_ar:            body.name_ar ?? body.name,
        entity_type:        body.entity_type,
        primary_activity:   body.primary_activity,
        secondary_activity: body.secondary_activity ?? null,
        employee_count:     body.employee_count,
        country:            body.country,
        city:               body.city,
        sector_id:          body.sector_id ?? null,
      })
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

    await supabase.from('audit_log').insert({
      org_id:      (data as Record<string, unknown>)['id'] as string,
      user_id:     user.id,
      action:      'organization_created',
      entity_type: 'organizations',
      entity_id:   data.id,
    });

    return NextResponse.json({ organization: data as Record<string, unknown> }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const tenant_id = new URL(request.url).searchParams.get('tenant_id');

    let query = supabase
      .from('organizations')
      .select('*, ai_generations(id, status, created_at, completed_at, total_tokens)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    // If called with tenant_id, filter (admin scope)
    if (tenant_id) {
      query = supabase
        .from('organizations')
        .select('*, ai_generations(id, status, created_at, completed_at, total_tokens)')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false });
    }

    const { data: orgData, error: orgError } = await query;
    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });

    return NextResponse.json({ organizations: orgData ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
