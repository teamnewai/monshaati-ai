'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import type { SaudiLibraryItem } from '@/types/database';

const TYPES = [
  { id: '',               label: 'الكل' },
  { id: 'policy',         label: '📜 سياسات' },
  { id: 'procedure',      label: '📋 إجراءات' },
  { id: 'kpi',            label: '📊 مؤشرات أداء' },
  { id: 'org_chart',      label: '🏗️ هياكل تنظيمية' },
  { id: 'job_description',label: '💼 أوصاف وظيفية' },
  { id: 'hr_template',    label: '👥 نماذج HR' },
  { id: 'form',           label: '📝 نماذج' },
  { id: 'sop',            label: '📂 SOPs' },
];

const SECTORS = [
  { id: '',              label: 'جميع القطاعات' },
  { id: 'healthcare',    label: '🏥 الصحة' },
  { id: 'finance',       label: '🏦 المالية' },
  { id: 'retail',        label: '🛒 التجزئة' },
  { id: 'technology',    label: '💻 التقنية' },
  { id: 'construction',  label: '🏗️ الإنشاءات' },
  { id: 'education',     label: '🎓 التعليم' },
  { id: 'consulting',    label: '💼 الاستشارات' },
];

export default function LibraryPage() {
  const [items,   setItems]   = useState<SaudiLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [type,    setType]    = useState('');
  const [sector,  setSector]  = useState('');
  const [total,   setTotal]   = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (type)   p.set('type', type);
    if (sector) p.set('sector', sector);
    const res = await fetch(`/api/library?${p}`);
    if (res.ok) { const d = await res.json(); setItems(d.items); setTotal(d.total); }
    setLoading(false);
  }, [search, type, sector]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">المكتبة السعودية 🇸🇦</h1>
        <p className="text-gray-500 mt-1">نماذج ووثائق جاهزة للسوق السعودي — {total} مصدر</p>
      </div>

      {/* Vision 2030 banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 mb-6 text-white flex items-center gap-4">
        <div className="text-3xl">🎯</div>
        <div>
          <div className="font-bold">مواد متوافقة مع رؤية 2030</div>
          <div className="text-sm opacity-80">تشمل لوائح نظام العمل السعودي، نطاقات، GOSI</div>
        </div>
      </div>

      <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              type === t.id ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
        <Input placeholder="ابحث في المكتبة..." value={search}
          onChange={e => setSearch(e.target.value)} className="flex-1" />
        <select value={sector} onChange={(e: { target: { value: string } }) => setSector(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-300 text-sm bg-white">
          {SECTORS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner className="py-20" size="lg" /> :
       items.length === 0 ? (
        <EmptyState icon="📚" title="لا توجد نتائج" description="جرب تغيير معايير البحث" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-gray-900 text-sm">{item.title_ar}</h3>
                <div className="flex gap-1 flex-shrink-0">
                  {item.is_free && <Badge variant="success">مجاني</Badge>}
                  {item.is_vision2030 && <Badge variant="info">2030</Badge>}
                  {item.is_nitaqat && <Badge variant="warning">نطاقات</Badge>}
                </div>
              </div>
              {item.description_ar && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.description_ar}</p>
              )}
              <div className="flex flex-wrap gap-1 mb-3">
                {item.tags.slice(0, 4).map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>⬇️ {item.downloads_count} تنزيل</span>
                {item.is_free && (
                  <button className="text-brand-600 font-medium hover:underline">تنزيل مجاناً</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
