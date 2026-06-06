import type React from 'react';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#c8912a',
};

export const metadata: Metadata = {
  title: {
    default: 'منشأتي AI — نظام التشغيل الذكي للمنشآت',
    template: '%s | منشأتي AI',
  },
  description: 'بناء الهيكل التنظيمي والسياسات والأوصاف الوظيفية ومؤشرات الأداء بالذكاء الاصطناعي',
  keywords: ['منشأتي', 'ذكاء اصطناعي', 'هيكل تنظيمي', 'سياسات', 'KPI', 'حوكمة', 'AI governance'],
  authors: [{ name: 'Monshaati AI' }],
  creator: 'Monshaati AI',
  robots: { index: true, follow: true },

  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    alternateLocale: 'en_US',
    title: 'منشأتي AI — نظام التشغيل الذكي للمنشآت',
    description: 'بناء الهيكل التنظيمي والسياسات والأوصاف الوظيفية ومؤشرات الأداء بالذكاء الاصطناعي',
    siteName: 'منشأتي AI',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="منشأتي" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW error:', err));
            });
          }
        `}} />
      </head>
      <body className="font-arabic antialiased bg-gray-50 text-gray-900">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "'Noto Sans Arabic', sans-serif",
              direction: 'rtl',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
            },
            success: {
              style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
            },
            error: {
              style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
            },
          }}
        />
      </body>
    </html>
  );
}
