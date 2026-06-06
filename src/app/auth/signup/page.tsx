'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('تم إنشاء حسابك! يمكنك البدء الآن');
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#04060e] via-[#07091a] to-[#0a0f20] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-4 shadow-2xl shadow-brand-900/50">م</div>
          <h1 className="text-2xl font-bold text-white">منشأتي AI</h1>
          <p className="text-gray-400 mt-1 text-sm">ابدأ تجربتك المجانية — 14 يوم بدون بطاقة</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">إنشاء حساب جديد</h2>
          <p className="text-sm text-gray-400 mb-6">يمكنك إنشاء نظامك التشغيلي خلال 5 دقائق</p>

          <form onSubmit={handleSignup} className="space-y-5">
            <Input id="name" label="الاسم الكامل *" value={name} onChange={e => setName(e.target.value)} placeholder="محمد أحمد الغامدي" required autoFocus />
            <Input id="email" label="البريد الإلكتروني *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" required />
            <Input id="password" label="كلمة المرور *" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8 أحرف على الأقل" required hint="استخدم كلمة مرور قوية تحتوي على أحرف وأرقام" />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              🚀 إنشاء الحساب مجاناً
            </Button>
          </form>

          <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 text-xs text-green-700 text-center">
            ✅ 14 يوم مجاناً | لا حاجة لبطاقة ائتمانية
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            بإنشاء حساب، أنت توافق على{' '}
            <a href="#" className="text-brand-600 hover:underline">شروط الاستخدام</a>{' '}و{' '}
            <a href="#" className="text-brand-600 hover:underline">سياسة الخصوصية</a>
          </p>

          <div className="mt-4 text-center text-sm text-gray-500">
            لديك حساب؟{' '}
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">تسجيل الدخول</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
