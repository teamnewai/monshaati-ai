import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

interface TenantPortalProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TenantPortalProps): Promise<Metadata> {
  const { slug }  = await params;
  const supabase  = await createServerSupabaseClient();
  const { data }  = await supabase.from('tenants')
    .select('app_name_ar, tagline_ar, logo_url').eq('slug', slug).eq('is_active', true).single();
  if (!data) return { title: 'منشأتي AI' };
  const t = data as Record<string,unknown>;
  return { title: (t.app_name_ar as string) ?? 'منشأتي AI', description: (t.tagline_ar as string) ?? '' };
}

export default async function TenantPortalPage({ params }: TenantPortalProps) {
  const { slug }  = await params;
  const supabase  = await createServerSupabaseClient();

  const { data: tenant } = await supabase.from('tenants')
    .select('id, slug, name, name_ar, app_name_ar, tagline_ar, description_ar, logo_url, favicon_url, primary_color, secondary_color, accent_color, support_email, support_phone, features_enabled, is_active, suspended_at')
    .eq('slug', slug).eq('is_active', true).single();

  if (!tenant || (tenant as Record<string,unknown>).suspended_at) notFound();

  const t = tenant as Record<string,unknown>;
  const primary   = (t.primary_color as string)   ?? '#c8912a';
  const secondary = (t.secondary_color as string)  ?? '#1a1a2e';
  const features  = (t.features_enabled as string[]) ?? [];
  const appName   = (t.app_name_ar as string) ?? (t.name_ar as string) ?? (t.name as string);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="theme-color" content={primary} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;900&display=swap" rel="stylesheet" />
        <style>{`
          :root { --primary: ${primary}; --secondary: ${secondary}; }
          * { box-sizing: border-box; }
          body { font-family: 'Noto Sans Arabic', sans-serif; margin: 0; background: #f9fafb; color: #1f2937; }
        `}</style>
      </head>
      <body>
        {/* Navbar */}
        <nav style={{ background: secondary, padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {t.logo_url ? (
              <img src={t.logo_url as string} alt={appName} style={{ height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: primary, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>
                {appName[0]}
              </div>
            )}
            <div style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>{appName}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href={`/t/${slug}/login`} style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '14px', padding: '0.5rem 1rem' }}>
              تسجيل الدخول
            </Link>
            <Link href={`/t/${slug}/signup`} style={{ background: primary, color: 'white', padding: '0.5rem 1.25rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
              ابدأ مجاناً
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '5rem 1.5rem 3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: `${primary}20`, color: primary, fontSize: '13px', fontWeight: 600, padding: '0.4rem 1rem', borderRadius: '999px', marginBottom: '1.5rem' }}>
            🤖 مدعوم بالذكاء الاصطناعي
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: secondary, margin: '0 0 1.25rem', lineHeight: 1.2 }}>
            {(t.tagline_ar as string) ?? 'نظام التشغيل الذكي لمنشأتك'}
          </h1>
          {t.description_ar && (
            <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.8 }}>
              {t.description_ar as string}
            </p>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/t/${slug}/signup`} style={{ background: primary, color: 'white', padding: '1rem 2.5rem', borderRadius: '14px', textDecoration: 'none', fontWeight: 700, fontSize: '1.05rem' }}>
              ابدأ مجاناً الآن ←
            </Link>
            <Link href={`/t/${slug}/login`} style={{ background: 'white', color: secondary, border: `2px solid ${secondary}`, padding: '1rem 2rem', borderRadius: '14px', textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem' }}>
              تسجيل الدخول
            </Link>
          </div>
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, color: secondary, marginBottom: '2rem' }}>ما يمكنك فعله</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '1rem' }}>
              {[
                features.includes('ai_generate')    && { icon: '🤖', title: 'توليد الهيكل التنظيمي', desc: 'بناء نظام تشغيل كامل بالذكاء الاصطناعي في دقائق' },
                features.includes('export')          && { icon: '📄', title: 'تصدير PDF/Word', desc: 'تنزيل مخرجاتك بتنسيقات احترافية' },
                features.includes('consultants')     && { icon: '👥', title: 'استشارات خبراء', desc: 'احجز جلسة مع مستشار معتمد' },
                features.includes('marketplace')     && { icon: '🛒', title: 'المتجر الرقمي', desc: 'قوالب ووثائق جاهزة للاستخدام' },
                features.includes('bi_funding')      && { icon: '💰', title: 'فرص التمويل', desc: 'اكتشف برامج التمويل المناسبة لمنشأتك' },
                features.includes('bi_cost')         && { icon: '📊', title: 'تحليل التكاليف', desc: 'احسب نقطة التعادل وهامش الربح' },
              ].filter(Boolean).map((f, i) => f && (
                <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, color: secondary, marginBottom: '0.4rem' }}>{f.title}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '3rem 1rem 2rem', color: '#9ca3af', fontSize: '0.8rem', borderTop: '1px solid #e5e7eb', marginTop: '3rem' }}>
          <div>{appName} — مدعوم بتقنية منشأتي AI</div>
          {t.support_email && <div style={{ marginTop: '0.5rem' }}>للدعم: <a href={`mailto:${t.support_email}`} style={{ color: primary }}>{t.support_email as string}</a></div>}
        </footer>
      </body>
    </html>
  );
}
