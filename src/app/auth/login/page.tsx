'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const router  = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('مرحباً بعودتك!');
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#04060e] via-[#07091a] to-[#0a0f20] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-4 shadow-2xl shadow-brand-900/50">م</div>
          <h1 className="text-2xl font-bold text-white">منشأتي AI</h1>
          <p className="text-gray-400 mt-1 text-sm">نظام التشغيل الذكي للمنشآت</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">تسجيل الدخول</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              id="email" label="البريد الإلكتروني" type="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@company.com" required autoFocus
            />
            <Input
              id="password" label="كلمة المرور" type="password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              تسجيل الدخول
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            ليس لديك حساب؟{' '}
            <Link href="/auth/signup" className="text-brand-600 font-semibold hover:underline">إنشاء حساب مجاني</Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-3">مدعوم من</p>
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <span>🇸🇦 السعودية</span>
            <span>🇦🇪 الإمارات</span>
            <span>🇺🇸 أمريكا</span>
            <span>🇪🇺 أوروبا</span>
          </div>
        </div>
      </div>
    </div>
  );
}
