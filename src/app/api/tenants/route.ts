import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();
    const { data, error } = await supabase
      .from('tenants')
      .select('*, tenant_members(role)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tenants: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await request.json() as {
      slug: string; name: string; name_ar?: string;
      app_name_ar?: string; support_email?: string;
      primary_color?: string; secondary_color?: string;
    };

    // Validate slug
    if (!/^[a-z0-9-]{3,40}$/.test(body.slug)) {
      return NextResponse.json({ error: 'Slug must be 3-40 lowercase letters, numbers, or hyphens' }, { status: 400 });
    }

    // Check slug uniqueness
    const { data: existing } = await supabase.from('tenants').select('id').eq('slug', body.slug).maybeSingle();
    if (existing) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });

    const { data, error } = await supabase.from('tenants').insert({
      owner_id:       user.id,
      slug:           body.slug,
      name:           body.name,
      name_ar:        body.name_ar ?? null,
      app_name_ar:    body.app_name_ar ?? body.name_ar ?? body.name,
      support_email:  body.support_email ?? null,
      primary_color:  body.primary_color ?? '#c8912a',
      secondary_color: body.secondary_color ?? '#1a1a2e',
      domain_verify_token: `monshaati-verify-${Math.random().toString(36).slice(2, 18)}`,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    await supabase.from('tenant_activity').insert({
      tenant_id: (data as Record<string,unknown>).id,
      actor_id:  user.id,
      action:    'tenant_created',
      metadata:  { name: body.name, slug: body.slug },
    });

    return NextResponse.json({ tenant: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
