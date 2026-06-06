import React from 'react';
'use client';
import { useState } from 'react';
import type { Metadata } from 'next';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import toast from 'react-hot-toast';

const CONTACT_OPTIONS = [
  { icon: '💬', title: 'الدردشة المباشرة', body: 'تحدث مع فريقنا فوراً عبر المنصة', action: 'ابدأ المحادثة', href: '/auth/signup' },
  { icon: '📧', title: 'البريد الإلكتروني', body: 'support@monshaati.ai', action: 'أرسل إيميل', href: 'mailto:support@monshaati.ai' },
  { icon: '📞', title: 'اتصل بنا', body: '+966 55 000 0000', action: 'اتصل الآن', href: 'tel:+966550000000' },
];

const SUBJECTS = [
  'استفسار عن المنتج',
  'دعم تقني',
  'طلب عرض تجريبي',
  'الشراكات والتكاملات',
  'الإعلام والصحافة',
  'الانضمام للفريق',
  'أخرى',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSending(true);
    // Simulate sending — in production connect to /api/email or a form service
    await new Promise(r => setTimeout(r, 1500));
    setSent(true);
    setSending(false);
    toast.success('تم إرسال رسالتك! سنرد عليك خلال 24 ساعة.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-gray-50 to-white py-14 sm:py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-4">تواصل معنا</div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              كيف يمكننا مساعدتك؟
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              فريقنا يرد على جميع الاستفسارات خلال 24 ساعة في أيام العمل.
            </p>
          </div>
        </section>

        {/* Contact options */}
        <section className="py-10 px-4">
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-4 mb-14">
            {CONTACT_OPTIONS.map(opt => (
              <a key={opt.title} href={opt.href}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center hover:border-brand-300 hover:bg-brand-50 transition-all block">
                <div className="text-3xl mb-3">{opt.icon}</div>
                <div className="font-bold text-gray-900 mb-1">{opt.title}</div>
                <div className="text-sm text-gray-500 mb-4">{opt.body}</div>
                <span className="text-xs font-bold text-brand-600">{opt.action} ←</span>
              </a>
            ))}
          </div>

          {/* Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6">أرسل لنا رسالة</h2>

              {sent ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">تم إرسال رسالتك!</h3>
                  <p className="text-gray-500">سنتواصل معك خلال 24 ساعة على {form.email}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        الاسم الكامل <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                        placeholder="محمد العمري"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        البريد الإلكتروني <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">موضوع الرسالة</label>
                    <select
                      value={form.subject}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(p => ({ ...p, subject: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none bg-white">
                      <option value="">اختر الموضوع</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      رسالتك <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(p => ({ ...p, message: e.target.value }))}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-400 focus:outline-none"
                      placeholder="اكتب رسالتك هنا..."
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors">
                    {sending ? 'جارٍ الإرسال...' : 'إرسال الرسالة ←'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Office info */}
        <section className="py-10 sm:py-14 bg-gray-50 px-4">
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: '📍', title: 'المقر الرئيسي', body: 'الرياض، المملكة العربية السعودية' },
              { icon: '🕐', title: 'ساعات العمل', body: 'الأحد – الخميس\n٩ ص – ٦ م (بتوقيت الرياض)' },
              { icon: '🌐', title: 'تابعنا', body: 'X · LinkedIn · YouTube' },
            ].map(info => (
              <div key={info.title} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="text-2xl mb-2">{info.icon}</div>
                <div className="font-bold text-gray-900 mb-1 text-sm">{info.title}</div>
                <div className="text-xs text-gray-500 whitespace-pre-line">{info.body}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
