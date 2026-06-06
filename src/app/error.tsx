'use client';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-200 p-12 max-w-md w-full text-center">
        <div className="text-6xl mb-6">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">حدث خطأ</h2>
        <p className="text-gray-500 mb-6 text-sm">
          {error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>إعادة المحاولة</Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
