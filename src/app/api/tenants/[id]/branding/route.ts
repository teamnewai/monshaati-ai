import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { data, error } = await supabase.from('tenants')
      .select('primary_color, secondary_color, accent_color, text_color, background_color, font_family, logo_url, favicon_url, app_name_ar, app_name_en, tagline_ar, custom_css')
      .eq('id', id).eq('owner_id', user.id).single();
    if (error || !data) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    return NextResponse.json({ branding: data });
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
    const body = await request.json() as Record<string, unknown>;

    const brandingFields = [
      'primary_color', 'secondary_color', 'accent_color', 'text_color',
      'background_color', 'font_family', 'logo_url', 'favicon_url',
      'app_name_ar', 'app_name_en', 'tagline_ar', 'custom_css',
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const k of brandingFields) { if (k in body) updates[k] = body[k]; }

    // Validate hex colors
    const colorFields = ['primary_color', 'secondary_color', 'accent_color', 'text_color', 'background_color'];
    for (const cf of colorFields) {
      if (updates[cf] && !/^#[0-9a-fA-F]{6}$/.test(updates[cf] as string)) {
        return NextResponse.json({ error: `Invalid hex color for ${cf}` }, { status: 400 });
      }
    }

    const { data, error } = await supabase.from('tenants')
      .update(updates).eq('id', id).eq('owner_id', user.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('tenant_activity').insert({
      tenant_id: id, actor_id: user.id,
      action: 'branding_updated', metadata: { fields: Object.keys(updates) },
    });

    return NextResponse.json({ branding: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
