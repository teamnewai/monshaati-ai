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
import type { Profile } from '@/types/database';
import toast from 'react-hot-toast';

const LANG_OPTIONS = [
  { value: 'ar', label: '🇸🇦 العربية' },
  { value: 'en', label: '🇺🇸 English' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading]  = useState(true);
  const [saving, setSaving]    = useState(false);
  const [form, setForm]        = useState({ full_name: '', full_name_ar: '', phone: '', preferred_lang: 'ar' });
  const router  = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const res = await fetch('/api/profiles');
    if (res.ok) {
      const { profile: p } = await res.json() as { profile: Profile };
      setProfile(p);
      setForm({
        full_name:      p.full_name ?? '',
        full_name_ar:   p.full_name_ar ?? '',
        phone:          p.phone ?? '',
        preferred_lang: p.preferred_lang,
      });
    }
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/profiles', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    if (res.ok) {
      toast.success('تم حفظ البيانات بنجاح');
      await fetchProfile();
    } else {
      toast.error('حدث خطأ. حاول مرة أخرى');
    }
    setSaving(false);
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">الملف الشخصي</h1>
          <p className="text-gray-500 mt-1">إدارة بيانات حسابك</p>
        </div>

        <Card title="معلومات الحساب">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="الاسم بالعربية"
                value={form.full_name_ar}
                onChange={e => setForm(p => ({ ...p, full_name_ar: e.target.value }))}
                placeholder="محمد أحمد"
              />
              <Input
                label="الاسم بالإنجليزية"
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Mohammed Ahmed"
              />
            </div>
            <Input
              label="رقم الجوال"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+966501234567"
              type="tel"
            />
            <Select
              label="اللغة المفضلة"
              options={LANG_OPTIONS}
              value={form.preferred_lang}
              onChange={e => setForm(p => ({ ...p, preferred_lang: e.target.value }))}
            />

            <div className="pt-2 border-t border-gray-100">
              <div className="text-sm text-gray-500 mb-4">
                <div><span className="text-gray-400">البريد الإلكتروني:</span> {profile?.email}</div>
                <div><span className="text-gray-400">الدور:</span> {profile?.role}</div>
                <div><span className="text-gray-400">تاريخ التسجيل:</span> {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ar-SA') : '—'}</div>
              </div>
              <Button onClick={handleSave} loading={saving}>حفظ التغييرات</Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
