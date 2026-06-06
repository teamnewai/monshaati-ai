'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import type { ConsultantProfile } from '@/types/database';

const SPECIALIZATIONS = ['استراتيجية','موارد بشرية','مالية','تسويق','عمليات','تقنية','قانوني','إدارة تغيير'];

export default function ConsultantsPage() {
  const [consultants, setConsultants] = useState<ConsultantProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [spec,     setSpec]     = useState('');
  const [total,    setTotal]    = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (spec)   params.set('specialization', spec);
    const res = await fetch(`/api/consultants?${params}`);
    if (res.ok) {
      const d = await res.json();
      setConsultants(d.consultants ?? []);
      setTotal(d.total ?? 0);
    }
    setLoading(false);
  }, [search, spec]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">المستشارون</h1>
        <p className="text-gray-500 mt-1">احجز جلسة استشارية مع خبراء معتمدين — {total} مستشار</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
        <Input placeholder="ابحث عن مستشار..." value={search}
          onChange={(e: { target: { value: string } }) => setSearch(e.target.value)} className="flex-1" />
        <select value={spec} onChange={(e: { target: { value: string } }) => setSpec(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm bg-white">
          <option value="">جميع التخصصات</option>
          {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner className="py-20" size="lg" /> :
       consultants.length === 0 ? (
        <EmptyState icon="👤" title="لا يوجد مستشارون" description="جرب تغيير معايير البحث" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {consultants.map(c => (
            <Link key={c.id} href={`/consultants/${c.id}`}>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" /> : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{c.display_name_ar ?? c.display_name}</h3>
                    <p className="text-sm text-gray-500">{c.years_experience} سنوات خبرة</p>
                    {c.is_featured && <Badge variant="info" className="mt-1">⭐ مميز</Badge>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {c.avg_rating > 0 ? `⭐ ${c.avg_rating.toFixed(1)}` : '—'}
                    </div>
                    <div className="text-xs text-gray-400">{c.total_reviews} تقييم</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{c.bio_ar ?? '—'}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {c.specializations.slice(0, 3).map(s => (
                    <Badge key={s} variant="default">{s}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-500">30 دقيقة</div>
                  <div className="font-bold text-brand-600">
                    {(c.price_30min_sar).toFixed(0)} ريال
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
