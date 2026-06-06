'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Suspense } from 'react';
import type { Tenant, TenantMember } from '@/types/database';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview',  label: '📊 نظرة عامة' },
  { id: 'branding',  label: '🎨 الهوية البصرية' },
  { id: 'domain',    label: '🌐 الدومين' },
  { id: 'members',   label: '👥 المستخدمون' },
  { id: 'features',  label: '⚡ المميزات' },
  { id: 'billing',   label: '💳 الفوترة' },
  { id: 'settings',  label: '⚙️ الإعدادات' },
];

function TenantDetailContent({ id }: { id: string }) {
  const [tenant,   setTenant]   = useState<Tenant | null>(null);
  const [members,  setMembers]  = useState<TenantMember[]>([]);
  const [features, setFeatures] = useState<{ key: string; label_ar: string; is_enabled: boolean }[]>([]);
  const [analytics,setAnalytics] = useState<Record<string,unknown> | null>(null);
  const [billing,  setBilling]  = useState<Record<string,unknown> | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('overview');
  const [saving,   setSaving]   = useState(false);
  const [branding, setBranding] = useState<Record<string,string>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [domainData, setDomainData] = useState<Record<string,unknown> | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const params  = useSearchParams();
  const router  = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    setLoading(true);
    const [tRes, mRes, fRes, aRes, bRes, dRes] = await Promise.all([
      fetch(`/api/tenants/${id}`),
      fetch(`/api/tenants/${id}/members`),
      fetch(`/api/tenants/${id}/features`),
      fetch(`/api/tenants/${id}/analytics`),
      fetch(`/api/tenants/${id}/billing`),
      fetch(`/api/tenants/${id}/domain`),
    ]);
    if (tRes.ok) { const d = await tRes.json(); setTenant(d.tenant); setBranding({ primary_color: d.tenant.primary_color ?? '#c8912a', secondary_color: d.tenant.secondary_color ?? '#1a1a2e', accent_color: d.tenant.accent_color ?? '#f59e0b', logo_url: d.tenant.logo_url ?? '', app_name_ar: d.tenant.app_name_ar ?? '', tagline_ar: d.tenant.tagline_ar ?? '' }); }
    else if (tRes.status === 403) { router.push('/admin/tenants'); return; }
    if (mRes.ok) { const d = await mRes.json(); setMembers(d.members ?? []); }
    if (fRes.ok) { const d = await fRes.json(); setFeatures(d.features ?? []); }
    if (aRes.ok) { const d = await aRes.json(); setAnalytics(d); }
    if (bRes.ok) { const d = await bRes.json(); setBilling(d.billing); }
    if (dRes.ok) { const d = await dRes.json(); setDomainData(d.domain); }
    setLoading(false);
  }, [id, router, supabase.auth]);

  useEffect(() => {
    load();
    if (params.get('billing_success') === 'true') toast.success('تم الاشتراك بنجاح!');
  }, [load, params]);

  const saveBranding = async () => {
    setSaving(true);
    const res = await fetch(`/api/tenants/${id}/branding`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(branding) });
    const d = await res.json();
    if (d.branding) toast.success('تم حفظ الهوية البصرية!');
    else toast.error(d.error ?? 'خطأ');
    setSaving(false);
  };

  const uploadLogo = async (file: File, type: 'logo' | 'favicon') => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    const res = await fetch(`/api/tenants/${id}/upload`, { method: 'POST', body: form });
    const d = await res.json();
    if (d.url) { setBranding(p => ({ ...p, [`${type}_url`]: d.url })); toast.success('تم رفع الصورة!'); }
    else toast.error(d.error ?? 'خطأ في الرفع');
  };

  const toggleFeature = async (key: string, enabled: boolean) => {
    const updated = features.map(f => f.key === key ? { ...f, is_enabled: enabled } : f);
    setFeatures(updated);
    const enabledKeys = updated.filter(f => f.is_enabled).map(f => f.key);
    await fetch(`/api/tenants/${id}/features`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features_enabled: enabledKeys }) });
  };

  const inviteMember = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    const res = await fetch(`/api/tenants/${id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, role: 'member' }) });
    const d = await res.json();
    if (d.member) { toast.success('تمت الدعوة!'); setInviteEmail(''); setAddMemberOpen(false); await load(); }
    else toast.error(d.error ?? 'خطأ');
    setInviting(false);
  };

  const verifyDomain = async () => {
    setVerifying(true);
    const res = await fetch(`/api/tenants/${id}/domain`, { method: 'PATCH' });
    const d = await res.json();
    if (d.verified) { toast.success('تم التحقق من الدومين!'); await load(); }
    else toast.error(d.message ?? 'لم يتم التحقق بعد');
    setVerifying(false);
  };

  const setupDomain = async () => {
    if (!newDomain) return;
    const res = await fetch(`/api/tenants/${id}/domain`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ custom_domain: newDomain }) });
    const d = await res.json();
    if (d.domain) { toast.success('تم حفظ الدومين! اتبع التعليمات للتحقق.'); setDomainData(d.domain); setNewDomain(''); await load(); }
    else toast.error(d.error ?? 'خطأ');
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;
  if (!tenant) return <DashboardLayout><div className="text-center py-20">غير موجود</div></DashboardLayout>;

  const ov = analytics?.overview as Record<string,unknown> ?? {};

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
            style={{ backgroundColor: tenant.primary_color ?? '#c8912a' }}>
            {tenant.logo_url ? <img src={tenant.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" /> : (tenant.name_ar ?? tenant.name)[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{tenant.name_ar ?? tenant.name}</h1>
              <Badge variant={tenant.is_active && !tenant.suspended_at ? 'success' : 'error'}>
                {tenant.is_active && !tenant.suspended_at ? 'نشط' : 'موقوف'}
              </Badge>
              {tenant.domain_verified && <Badge variant="info">✓ دومين موثق</Badge>}
            </div>
            <div className="text-sm text-gray-500 mt-0.5">
              /{tenant.slug} {tenant.custom_domain ? `• ${tenant.custom_domain}` : ''} • {tenant.orgs_count} منشأة
            </div>
          </div>
          <Link href="/admin/tenants">
            <Button variant="outline" size="sm">← الرجوع</Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard value={String(ov.total_orgs ?? 0)}        label="المنشآت"     icon="🏢" color="brand" />
              <StatCard value={String(ov.total_users ?? 0)}       label="المستخدمون" icon="👥" color="blue" />
              <StatCard value={String(ov.gens_this_month ?? 0)}   label="توليدات/شهر" icon="🤖" color="purple" />
              <StatCard value={`$${Number(ov.total_revenue ?? 0).toFixed(0)}`} label="الإيرادات" icon="💰" color="green" />
            </div>

            {/* Recent orgs */}
            {((analytics as Record<string,unknown> | null)?.orgs as Record<string,unknown>[] | undefined)?.length ? (
              <Card title="المنشآت المرتبطة">
                <div className="divide-y divide-gray-100">
                  {((analytics?.orgs as Record<string,unknown>[]) ?? []).slice(0,5).map((o) => (
                    <div key={o.id as string} className="flex items-center justify-between py-3">
                      <div className="font-medium text-sm text-gray-900">{o.name as string}</div>
                      <Badge>{o.subscription_plan as string}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card title="المنشآت المرتبطة">
                <div className="text-center py-8 text-gray-400 text-sm">
                  لا توجد منشآت بعد. المنشآت ترتبط عند التسجيل عبر صفحة المستأجر.
                </div>
              </Card>
            )}

            {/* Activity */}
            {((analytics as Record<string,unknown> | null)?.activity as Record<string,unknown>[] | undefined)?.length ? (
              <Card title="آخر النشاطات">
                {((analytics?.activity as Record<string,unknown>[]) ?? []).slice(0,6).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="text-xs text-gray-400 w-32 flex-shrink-0">{new Date(a.created_at as string).toLocaleDateString('ar-SA')}</div>
                    <div className="text-sm text-gray-700">{a.action as string}</div>
                  </div>
                ))}
              </Card>
            ) : null}
          </div>
        )}

        {/* BRANDING */}
        {tab === 'branding' && (
          <div className="space-y-6">
            <Card title="الشعار والأيقونة">
              <div className="grid grid-cols-2 gap-6">
                {(['logo','favicon'] as const).map(type => (
                  <div key={type}>
                    <div className="text-sm font-semibold text-gray-700 mb-3">{type === 'logo' ? 'الشعار الرئيسي' : 'الأيقونة (Favicon)'}</div>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-300 transition-colors">
                      {(branding[`${type}_url`] || tenant[`${type}_url` as keyof Tenant]) ? (
                        <img src={(branding[`${type}_url`] || tenant[`${type}_url` as keyof Tenant]) as string}
                          alt="" className={`mx-auto mb-3 object-contain ${type === 'logo' ? 'h-16' : 'h-8'}`} />
                      ) : (
                        <div className="text-4xl mb-3">{type === 'logo' ? '🖼️' : '🔖'}</div>
                      )}
                      <label className="cursor-pointer">
                        <span className="text-xs text-brand-600 font-medium hover:underline">رفع {type === 'logo' ? 'شعار' : 'أيقونة'}</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e: { target: { files: FileList | null } }) => e.target.files?.[0] && uploadLogo(e.target.files[0], type)} />
                      </label>
                      <div className="text-xs text-gray-400 mt-1">PNG, SVG — max 2MB</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="الألوان والنصوص">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'primary_color',   label: 'اللون الرئيسي' },
                    { key: 'secondary_color', label: 'اللون الثانوي' },
                    { key: 'accent_color',    label: 'لون التمييز' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-gray-700 block mb-2">{label}</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={branding[key] ?? '#c8912a'}
                          onChange={(e: { target: { value: string } }) => setBranding(p => ({ ...p, [key]: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-1" />
                        <input type="text" value={branding[key] ?? ''}
                          onChange={(e: { target: { value: string } }) => setBranding(p => ({ ...p, [key]: e.target.value }))}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">اسم التطبيق (للعملاء)</label>
                    <input value={branding.app_name_ar ?? ''} onChange={(e: { target: { value: string } }) => setBranding(p => ({...p, app_name_ar: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">الشعار النصي</label>
                    <input value={branding.tagline_ar ?? ''} onChange={(e: { target: { value: string } }) => setBranding(p => ({...p, tagline_ar: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none" />
                  </div>
                </div>

                {/* Live Preview */}
                <div className="border-2 rounded-2xl overflow-hidden mt-4" style={{ borderColor: branding.primary_color ?? '#c8912a' }}>
                  <div className="h-14 flex items-center gap-3 px-5" style={{ backgroundColor: branding.secondary_color ?? '#1a1a2e' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm"
                      style={{ backgroundColor: branding.primary_color ?? '#c8912a' }}>
                      {branding.app_name_ar?.[0] ?? tenant.name[0]}
                    </div>
                    <div>
                      <div className="text-white text-sm font-bold leading-none">{branding.app_name_ar || tenant.app_name_ar || tenant.name}</div>
                      {branding.tagline_ar && <div className="text-white/60 text-xs mt-0.5">{branding.tagline_ar}</div>}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 text-xs text-gray-500 text-center">معاينة حية — شريط التنقل</div>
                </div>

                <Button onClick={saveBranding} loading={saving} className="w-full">
                  💾 حفظ الهوية البصرية
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* DOMAIN */}
        {tab === 'domain' && (
          <Card title="إعداد الدومين المخصص 🌐">
            <div className="space-y-6">
              {domainData && (domainData as Record<string,unknown>).custom_domain ? (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-bold text-gray-900">{(domainData as Record<string,unknown>).custom_domain as string}</span>
                    <Badge variant={(domainData as Record<string,unknown>).domain_verified ? 'success' : 'warning'}>
                      {(domainData as Record<string,unknown>).domain_verified ? '✓ موثق' : '⏳ قيد التحقق'}
                    </Badge>
                  </div>
                  {!(domainData as Record<string,unknown>).domain_verified && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                      <div className="font-semibold text-amber-800 mb-2">📋 أضف هذا السجل في إعدادات DNS</div>
                      <div className="font-mono text-xs bg-white rounded-lg p-3 border border-amber-200">
                        <div className="text-gray-500 mb-1">Type: <span className="text-gray-900">TXT</span></div>
                        <div className="text-gray-500 mb-1">Name: <span className="text-gray-900 break-all">_monshaati-verify.{(domainData as Record<string,unknown>).custom_domain as string}</span></div>
                        <div className="text-gray-500">Value: <span className="text-gray-900 break-all">{(domainData as Record<string,unknown>).domain_verify_token as string}</span></div>
                      </div>
                      <Button className="mt-3 w-full" onClick={verifyDomain} loading={verifying}>
                        🔍 التحقق الآن
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">أضف دومين مخصص لعملائك بدلاً من monshaati.ai/slug</p>
                  <div className="flex gap-2">
                    <input value={newDomain} onChange={(e: { target: { value: string } }) => setNewDomain(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                      placeholder="app.yourcompany.com" />
                    <Button onClick={setupDomain}>إضافة الدومين</Button>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <div className="font-semibold mb-2">📌 خطوات الإعداد</div>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>أضف الدومين أعلاه</li>
                  <li>اذهب لإعدادات DNS في مزود الدومين</li>
                  <li>أضف سجل CNAME: <code className="bg-white px-1 rounded">{tenant.slug}.monshaati.ai</code></li>
                  <li>أضف سجل TXT للتحقق</li>
                  <li>اضغط "التحقق الآن" (قد يستغرق ساعة)</li>
                </ol>
              </div>
            </div>
          </Card>
        )}

        {/* MEMBERS */}
        {tab === 'members' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">{members.length} مستخدم</div>
              <Button size="sm" onClick={() => setAddMemberOpen(true)}>+ دعوة مستخدم</Button>
            </div>
            <Card title="المستخدمون">
              {members.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">لا يوجد مستخدمون إضافيون</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {members.map(m => {
                    const mp = m.profiles as Record<string,unknown> | undefined;
                    return (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium text-sm text-gray-900">{mp?.full_name as string ?? 'غير محدد'}</div>
                        <div className="text-xs text-gray-400">{mp?.email as string}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.role === 'owner' ? 'success' : m.role === 'admin' ? 'info' : 'default'}>
                          {m.role === 'owner' ? 'مالك' : m.role === 'admin' ? 'مدير' : 'عضو'}
                        </Badge>
                        {m.role !== 'owner' && (
                          <button onClick={async () => { await fetch(`/api/tenants/${id}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: m.id }) }); load(); }}
                            className="text-xs text-red-500 hover:text-red-700">إزالة</button>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </Card>
            <Modal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="دعوة مستخدم">
              <div className="space-y-4">
                <Input label="البريد الإلكتروني" value={inviteEmail}
                  onChange={(e: { target: { value: string } }) => setInviteEmail(e.target.value)}
                  placeholder="user@company.com" type="email" />
                <p className="text-xs text-gray-500">يجب أن يكون المستخدم مسجلاً في منشأتي AI</p>
                <Button className="w-full" onClick={inviteMember} loading={inviting}>دعوة</Button>
              </div>
            </Modal>
          </div>
        )}

        {/* FEATURES */}
        {tab === 'features' && (
          <Card title="المميزات المفعّلة">
            <p className="text-sm text-gray-500 mb-4">اختر المميزات المتاحة لعملاء هذا المستأجر</p>
            <div className="space-y-2">
              {features.map(f => (
                <div key={f.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-900">{f.label_ar}</span>
                  <button onClick={() => toggleFeature(f.key, !f.is_enabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${f.is_enabled ? 'bg-brand-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${f.is_enabled ? 'translate-x-5 left-1' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* BILLING */}
        {tab === 'billing' && (
          <Card title="الفوترة">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatCard value={`$${Number((billing as Record<string,unknown>)?.total_revenue ?? 0).toFixed(0)}`} label="إجمالي الإيرادات" icon="💰" color="green" />
                <StatCard value={`$${Number((billing as Record<string,unknown>)?.revenue_this_month ?? 0).toFixed(0)}`} label="هذا الشهر" icon="📅" color="blue" />
                <StatCard value={`$${Number((billing as Record<string,unknown>)?.monthly_fee_usd ?? 299).toFixed(0)}/شهر`} label="رسوم White Label" icon="📦" color="brand" />
              </div>
              {(billing as Record<string,unknown>)?.stripe_customer_id ? (
                <Button className="w-full" onClick={async () => { const r = await fetch(`/api/tenants/${id}/billing`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({action:'portal'}) }); const d = await r.json(); if (d.url) window.location.href = d.url; }}>
                  🔗 إدارة الاشتراك في Stripe
                </Button>
              ) : (
                <Button className="w-full" onClick={async () => { const r = await fetch(`/api/tenants/${id}/billing`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({action:'subscribe'}) }); const d = await r.json(); if (d.url) window.location.href = d.url; }}>
                  💳 اشترك في خطة White Label ($299/شهر)
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <TenantSettingsTab tenant={tenant} id={id} onSaved={load} />
        )}
      </div>
    </DashboardLayout>
  );
}

function TenantSettingsTab({ tenant, id, onSaved }: { tenant: Tenant; id: string; onSaved: () => void }) {
  const [form,   setForm]   = useState({ name: tenant.name, name_ar: tenant.name_ar ?? '', support_email: tenant.support_email ?? '', support_phone: tenant.support_phone ?? '', notes: tenant.notes ?? '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/tenants/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    if (d.tenant) { toast.success('تم الحفظ!'); onSaved(); }
    else toast.error(d.error ?? 'خطأ');
    setSaving(false);
  };

  return (
    <Card title="الإعدادات الأساسية">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="الاسم بالإنجليزية" value={form.name} onChange={(e: { target: { value: string } }) => setForm(p => ({...p, name: e.target.value}))} />
          <Input label="الاسم بالعربية" value={form.name_ar} onChange={(e: { target: { value: string } }) => setForm(p => ({...p, name_ar: e.target.value}))} />
        </div>
        <Input label="بريد الدعم" value={form.support_email} onChange={(e: { target: { value: string } }) => setForm(p => ({...p, support_email: e.target.value}))} type="email" />
        <Input label="هاتف الدعم" value={form.support_phone} onChange={(e: { target: { value: string } }) => setForm(p => ({...p, support_phone: e.target.value}))} type="tel" />
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">ملاحظات داخلية</label>
          <textarea value={form.notes} onChange={(e: { target: { value: string } }) => setForm(p => ({...p, notes: e.target.value}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-400 focus:outline-none" rows={3} />
        </div>
        <Button className="w-full" onClick={save} loading={saving}>حفظ الإعدادات</Button>
      </div>
    </Card>
  );
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>}>
      <TenantDetailContent id={id} />
    </Suspense>
  );
}
