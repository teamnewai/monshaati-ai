'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ENTITY_TYPES, ORG_SIZES, COUNTRIES, CITIES } from '@/lib/utils';
import type { Organization } from '@/types/database';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [org, setOrg]           = useState<Organization | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm]         = useState({
    name: '', primary_activity: '', employee_count: '', country: 'SA', city: '', website: '', phone: '',
  });
  const router  = useRouter();
  const supabase = createClient();

  const fetchOrg = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const res = await fetch('/api/organizations');
    if (res.ok) {
      const { organizations } = await res.json() as { organizations: Organization[] };
      const first = organizations[0];
      if (first) {
        setOrg(first);
        setForm({
          name:             first.name,
          primary_activity: first.primary_activity,
          employee_count:   first.employee_count,
          country:          first.country,
          city:             first.city,
          website:          first.website ?? '',
          phone:            first.phone ?? '',
        });
      }
    }
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    const res = await fetch(`/api/organizations/${org.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    if (res.ok) { toast.success('تم حفظ الإعدادات'); await fetchOrg(); }
    else        { toast.error('حدث خطأ'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!org) return;
    setDeleting(true);
    const res = await fetch(`/api/organizations/${org.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('تم حذف المنشأة');
      router.push('/dashboard');
    } else {
      toast.error('فشل الحذف');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  const cityOptions  = (CITIES[form.country] ?? []).map(c => ({ value: c, label: c }));
  const entityOpts   = Object.entries(ENTITY_TYPES).map(([v, l]) => ({ value: v, label: l }));
  const sizeOpts     = Object.entries(ORG_SIZES).map(([v, l]) => ({ value: v, label: l }));
  const countryOpts  = Object.entries(COUNTRIES).map(([v, l]) => ({ value: v, label: l }));

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">إعدادات المنشأة</h1>
          <p className="text-gray-500 mt-1">إدارة بيانات منشأتك</p>
        </div>

        {org ? (
          <>
            <Card title="البيانات الأساسية" className="mb-6">
              <div className="space-y-5">
                <Input label="اسم المنشأة" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                <Input label="النشاط الرئيسي" value={form.primary_activity} onChange={e => setForm(p => ({ ...p, primary_activity: e.target.value }))} />
                <div className="grid grid-cols-2 gap-4">
                  <Select label="الدولة" options={countryOpts} value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, city: '' }))} />
                  <Select label="المدينة" options={cityOptions} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="اختر المدينة" />
                </div>
                <Select label="حجم المنشأة" options={sizeOpts} value={form.employee_count} onChange={e => setForm(p => ({ ...p, employee_count: e.target.value }))} />
                <Input label="الموقع الإلكتروني" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://company.com" type="url" />
                <Input label="رقم الهاتف" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+96612345678" type="tel" />
                <Button onClick={handleSave} loading={saving}>حفظ التغييرات</Button>
              </div>
            </Card>

            <Card title="منطقة الخطر" className="border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">حذف المنشأة</p>
                  <p className="text-sm text-gray-500 mt-1">سيتم حذف جميع البيانات المرتبطة بالمنشأة نهائياً</p>
                </div>
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>حذف المنشأة</Button>
              </div>
            </Card>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">لا توجد منشأة مرتبطة بحسابك</p>
            <Button className="mt-4" onClick={() => router.push('/onboarding')}>إنشاء منشأة</Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="تأكيد حذف المنشأة"
        message={`هل أنت متأكد من حذف "${org?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائياً"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
