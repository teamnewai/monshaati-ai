'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function NewTenantPage() {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', name_ar: '', slug: '', app_name_ar: '',
    support_email: '', primary_color: '#c8912a', secondary_color: '#1a1a2e',
  });

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    if (k === 'name') {
      setForm(p => ({
        ...p, name: v,
        slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      }));
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.slug) { toast.error('الاسم والـ slug مطلوبان'); return; }
    setSaving(true);
    const res = await fetch('/api/tenants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.tenant) { toast.success('تم إنشاء المستأجر!'); router.push(`/admin/tenants/${d.tenant.id}`); }
    else { toast.error(d.error ?? 'خطأ'); setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">إنشاء مستأجر جديد</h1>
          <p className="text-gray-500 mt-1">إعداد White Label جديد للعميل</p>
        </div>
        <Card title="معلومات المستأجر">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم بالإنجليزية *" value={form.name}
                onChange={(e: { target: { value: string } }) => set('name', e.target.value)} placeholder="ACME Corp" />
              <Input label="الاسم بالعربية" value={form.name_ar}
                onChange={(e: { target: { value: string } }) => set('name_ar', e.target.value)} placeholder="شركة أكمي" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">الـ Slug (URL) *</label>
              <div className="flex">
                <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-r-xl text-xs text-gray-500">monshaati.ai/</span>
                <input value={form.slug} onChange={(e: { target: { value: string } }) => set('slug', e.target.value)}
                  className="flex-1 px-3 py-2 border border-r-0 border-gray-300 rounded-l-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                  placeholder="acme-corp" />
              </div>
              <p className="text-xs text-gray-400 mt-1">أحرف صغيرة، أرقام، وشرطات فقط (3-40 حرف)</p>
            </div>
            <Input label="اسم التطبيق (للعملاء)" value={form.app_name_ar}
              onChange={(e: { target: { value: string } }) => set('app_name_ar', e.target.value)} placeholder="منصة أكمي للأعمال" />
            <Input label="البريد الإلكتروني للدعم" value={form.support_email}
              onChange={(e: { target: { value: string } }) => set('support_email', e.target.value)} placeholder="support@acme.com" type="email" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">اللون الرئيسي</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primary_color} onChange={(e: { target: { value: string } }) => set('primary_color', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-1" />
                  <span className="text-sm text-gray-600 font-mono">{form.primary_color}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">اللون الثانوي</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.secondary_color} onChange={(e: { target: { value: string } }) => set('secondary_color', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-1" />
                  <span className="text-sm text-gray-600 font-mono">{form.secondary_color}</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border-2 rounded-2xl overflow-hidden" style={{ borderColor: form.primary_color }}>
              <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: form.secondary_color }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: form.primary_color }}>م</div>
                <span className="text-white text-sm font-semibold">{form.app_name_ar || form.name_ar || form.name || 'اسم التطبيق'}</span>
              </div>
              <div className="p-4 bg-gray-50 text-xs text-gray-500">معاينة حية للهوية البصرية</div>
            </div>

            <Button className="w-full" size="lg" onClick={handleCreate} loading={saving}>
              إنشاء المستأجر
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
