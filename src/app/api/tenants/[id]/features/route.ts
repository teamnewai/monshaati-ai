import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

const ALL_FEATURES = [
  'ai_generate','export','billing','consultants','marketplace','library',
  'bi_funding','bi_cost','bi_financial','bi_loss_analysis','bi_business_state',
  'bi_recommendations','payg','referrals',
];
const LABELS: Record<string,string> = {
  ai_generate: 'توليد AI', export: 'تصدير PDF/Word', billing: 'الفوترة',
  consultants: 'سوق المستشارين', marketplace: 'المتجر الرقمي',
  library: 'المكتبة السعودية', bi_funding: 'التمويل', bi_cost: 'التكاليف',
  bi_financial: 'المالية', bi_loss_analysis: 'تحليل الخسائر',
  bi_business_state: 'تحليل الوضع', bi_recommendations: 'توصيات AI',
  payg: 'PAYG', referrals: 'الإحالات',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { data: t } = await supabase.from('tenants').select('owner_id, features_enabled').eq('id', id).single();
    if (!t || (t as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const enabled = (t as Record<string,unknown>).features_enabled as string[] ?? [];
    return NextResponse.json({
      features: ALL_FEATURES.map(f => ({ key: f, label_ar: LABELS[f] ?? f, is_enabled: enabled.includes(f) })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = await params;
    const { features_enabled } = await request.json() as { features_enabled: string[] };
    const { data: t } = await supabase.from('tenants').select('owner_id').eq('id', id).single();
    if (!t || (t as Record<string,unknown>).owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const valid = features_enabled.filter(f => ALL_FEATURES.includes(f));
    await supabase.from('tenants').update({ features_enabled: valid }).eq('id', id);
    await supabase.from('tenant_activity').insert({ tenant_id: id, actor_id: user.id, action: 'features_updated', metadata: { features_enabled: valid } });
    return NextResponse.json({ features_enabled: valid });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
