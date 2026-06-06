'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import type { MarketplaceProduct } from '@/types/database';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: '',                 label: 'الكل' },
  { id: 'org_chart',        label: '🏗️ هياكل تنظيمية' },
  { id: 'policies',         label: '📜 سياسات' },
  { id: 'procedures',       label: '📋 إجراءات' },
  { id: 'sops',             label: '📂 SOPs' },
  { id: 'kpi_templates',    label: '📊 KPI Templates' },
  { id: 'hr_templates',     label: '👥 قوالب HR' },
  { id: 'strategic_plans',  label: '🎯 خطط استراتيجية' },
  { id: 'saudi_compliance', label: '🇸🇦 لوائح سعودية' },
];

export default function MarketplacePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [total,    setTotal]    = useState(0);
  const [buying,   setBuying]   = useState<string | null>(null);
  const [orgId,    setOrgId]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)   params.set('q', search);
    if (category) params.set('category', category);
    if (freeOnly) params.set('free', 'true');
    const [prodRes, orgRes] = await Promise.all([
      fetch(`/api/marketplace/products?${params}`),
      fetch('/api/organizations'),
    ]);
    if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products); setTotal(d.total); }
    if (orgRes.ok)  { const d = await orgRes.json(); setOrgId(d.organizations?.[0]?.id ?? null); }
    setLoading(false);
  }, [search, category, freeOnly]);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (product: MarketplaceProduct) => {
    setBuying(product.id);
    try {
      const res = await fetch('/api/marketplace/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, org_id: orgId }),
      });
      const d = await res.json();
      if (d.url)      window.location.href = d.url;
      else if (d.purchase) { toast.success('تم الحصول على المنتج بنجاح!'); await load(); }
      else toast.error(d.error ?? 'حدث خطأ');
    } finally { setBuying(null); }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">المتجر الرقمي</h1>
        <p className="text-gray-500 mt-1">قوالب ووثائق جاهزة للتنزيل — {total} منتج</p>
      </div>

      <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2">
        {CATEGORIES.map(c => (
          <button key={c.id}
            onClick={() => setCategory(c.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              category === c.id ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
        <Input placeholder="ابحث في المنتجات..." value={search}
          onChange={e => setSearch(e.target.value)} className="flex-1" />
        <button onClick={() => setFreeOnly(p => !p)}
          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
            freeOnly ? 'bg-green-500 text-white border-green-500' : 'bg-white border-gray-300 text-gray-600'
          }`}>
          مجاني فقط
        </button>
      </div>

      {loading ? <LoadingSpinner className="py-20" size="lg" /> :
       products.length === 0 ? (
        <EmptyState icon="🛍️" title="لا توجد منتجات" description="جرب تغيير الفئة أو كلمة البحث" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
              {p.cover_image_url && (
                <img src={p.cover_image_url} alt="" className="w-full h-32 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{p.title_ar}</h3>
                  <Badge variant={p.is_free ? 'success' : 'default'}>
                    {p.is_free ? 'مجاني' : `${p.price_sar.toFixed(0)} ريال`}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.description_ar}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <span>⬇️ {p.downloads_count}</span>
                  {p.avg_rating > 0 && <span>⭐ {p.avg_rating.toFixed(1)}</span>}
                  <span>📄 {p.file_format?.toUpperCase()}</span>
                </div>
                <Button size="sm" className="w-full"
                  onClick={() => handleBuy(p)}
                  loading={buying === p.id}>
                  {p.is_free ? '⬇️ تنزيل مجاناً' : '🛒 شراء'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
