export default function OfflinePage() {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "'Noto Sans Arabic', sans-serif", background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📡</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937', marginBottom: '0.5rem' }}>غير متصل بالإنترنت</h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>تحقق من اتصالك وأعد المحاولة</p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#c8912a', color: 'white', border: 'none', borderRadius: '12px', padding: '0.75rem 2rem', fontSize: '1rem', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 700 }}>
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
