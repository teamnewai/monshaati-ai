import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { data: t } = await supabase.from('tenants').select('owner_id, slug').eq('id', id).single();
    if (!t || (t as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const form = await (request as unknown as { formData(): Promise<FormData> }).formData();
    const file = form.get('file') as File | null;
    const type = form.get('type') as string | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!['logo','favicon'].includes(type ?? '')) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    const slug = (t as Record<string,unknown>).slug as string;
    const ext  = file.name.split('.').pop() ?? 'png';
    const path = `tenants/${slug}/${type}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const admin = await createAdminSupabaseClient();
    let publicUrl: string;
    const adminAny = admin as unknown as Record<string, {from(bucket: string): {upload(p: string, b: ArrayBuffer, opts: Record<string,unknown>): Promise<{error: unknown}>; getPublicUrl(p: string): {data: {publicUrl: string}}}}>;
    const { error: uploadError } = await adminAny.storage.from('tenant-assets').upload(path, bytes, { contentType: file.type, upsert: true });
    if (uploadError) {
      publicUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(slug)}&size=200&background=c8912a&color=fff&bold=true`;
    } else {
      publicUrl = adminAny.storage.from('tenant-assets').getPublicUrl(path).data.publicUrl;
    }
    const field = type === 'logo' ? 'logo_url' : 'favicon_url';
    await supabase.from('tenants').update({ [field]: publicUrl }).eq('id', id);
    await supabase.from('tenant_activity').insert({ tenant_id: id, actor_id: user.id, action: `${type}_uploaded`, metadata: { url: publicUrl } });
    return NextResponse.json({ url: publicUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
