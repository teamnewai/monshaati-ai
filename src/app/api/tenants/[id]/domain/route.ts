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
      .select('custom_domain, domain_verified, domain_verify_token, domain_verified_at, slug')
      .eq('id', id).eq('owner_id', user.id).single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ domain: data });
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
    const { custom_domain } = await request.json() as { custom_domain: string };

    if (!custom_domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(custom_domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    const token = `monshaati-verify-${Math.random().toString(36).slice(2,10)}${Math.random().toString(36).slice(2,10)}`;

    const { data, error } = await supabase.from('tenants').update({
      custom_domain,
      domain_verified: false,
      domain_verified_at: null,
      domain_verify_token: token,
    }).eq('id', id).eq('owner_id', user.id).select('custom_domain, domain_verify_token').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('tenant_domain_checks').insert({
      tenant_id: id,
      domain: custom_domain,
      token,
      method: 'CNAME',
      status: 'pending',
    });

    return NextResponse.json({
      domain: data,
      instructions: {
        type: 'CNAME',
        name: custom_domain,
        value: `${(await supabase.from('tenants').select('slug').eq('id', id).single()).data?.slug ?? 'yourtenant'}.monshaati.ai`,
        txt_record: {
          type: 'TXT',
          name: `_monshaati-verify.${custom_domain}`,
          value: token,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Trigger domain verification check
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;

    const { data: tenant } = await supabase.from('tenants')
      .select('custom_domain, domain_verify_token, slug')
      .eq('id', id).eq('owner_id', user.id).single();
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const t = tenant as Record<string, unknown>;
    const domain  = t.custom_domain as string;
    const token   = t.domain_verify_token as string;

    if (!domain) return NextResponse.json({ error: 'No domain configured' }, { status: 400 });

    // In production: do actual DNS lookup. Here we simulate and mark verified.
    // Real implementation: use Node dns.resolve or external DNS API
    // DNS verification via Cloudflare DNS-over-HTTPS (works in Edge/Node)
    let verified = false;
    try {
      const dnsUrl = `https://cloudflare-dns.com/dns-query?name=_monshaati-verify.${domain}&type=TXT`;
      const dnsRes = await fetch(dnsUrl, { headers: { 'Accept': 'application/dns-json' } });
      if (dnsRes.ok) {
        const dnsData = await dnsRes.json() as { Answer?: { type: number; data: string }[] };
        const txtRecords = (dnsData.Answer ?? []).filter((r) => r.type === 16);
        verified = txtRecords.some((r) => r.data.replace(/"/g, '').trim() === token);
      }
    } catch {
      // DNS check failed — user should retry later
      verified = false;
    }

    if (verified) {
      await supabase.from('tenants').update({
        domain_verified: true,
        domain_verified_at: new Date().toISOString(),
      }).eq('id', id);
      await supabase.from('tenant_domain_checks').update({
        status: 'verified', verified_at: new Date().toISOString(), last_check: new Date().toISOString(),
      }).eq('tenant_id', id).eq('domain', domain);
      await supabase.from('tenant_activity').insert({ tenant_id: id, actor_id: user.id, action: 'domain_verified', metadata: { domain } });
    } else {
      await supabase.from('tenant_domain_checks').update({ status: 'pending', last_check: new Date().toISOString() }).eq('tenant_id', id).eq('domain', domain);
    }

    return NextResponse.json({ verified, domain, message: verified ? 'Domain verified!' : 'DNS record not found yet. Please wait up to 24h for DNS propagation.' });
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
    await supabase.from('tenants').update({ custom_domain: null, domain_verified: false, domain_verify_token: null }).eq('id', id).eq('owner_id', user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
