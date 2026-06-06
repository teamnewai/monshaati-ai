import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = `${process.env.EMAIL_FROM_NAME ?? 'منشأتي AI'} <${process.env.EMAIL_FROM ?? 'noreply@monshaati.ai'}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://monshaati.ai';

// ── HTML Shell ──────────────────────────────────────────────
function shell(content: string, preview = ''): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>منشأتي AI</title>
<style>
body{margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;text-align:right}
.w{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hdr{background:linear-gradient(135deg,#c8912a,#a97022);padding:32px 40px;text-align:center}
.logo{display:inline-block;width:52px;height:52px;background:rgba(255,255,255,.2);border-radius:14px;font-size:26px;font-weight:900;color:#fff;line-height:52px;margin-bottom:10px}
.hdr-t{color:#fff;font-size:20px;font-weight:800;margin:0}
.bd{padding:36px}
.h1{font-size:20px;font-weight:700;color:#1f2937;margin-bottom:14px}
.p{font-size:14px;line-height:1.9;color:#4b5563;margin-bottom:16px}
.btn{display:inline-block;background:#c8912a;color:#fff!important;text-decoration:none;padding:13px 30px;border-radius:12px;font-size:14px;font-weight:700}
.box{background:#fdf8ee;border-right:4px solid #c8912a;padding:16px 20px;border-radius:0 12px 12px 0;margin:18px 0}
.warn{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin:18px 0;color:#92400e;font-size:14px}
.ok{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 18px;margin:18px 0;color:#166534;font-size:14px}
.div{height:1px;background:#e5e7eb;margin:24px 0}
.ft{background:#f8fafc;padding:20px 36px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
.ft a{color:#c8912a;text-decoration:none}
.stat-row{display:flex;gap:12px;margin:18px 0}
.stat{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center}
.stat-v{font-size:22px;font-weight:800;color:#c8912a}
.stat-l{font-size:11px;color:#6b7280;margin-top:3px}
</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden">${preview}</div>
<div style="padding:20px 12px;background:#f8fafc">
<div class="w">
<div class="hdr"><div class="logo">م</div><p class="hdr-t">منشأتي AI</p></div>
<div class="bd">${content}</div>
<div class="ft">
<p>© 2025 منشأتي AI — جميع الحقوق محفوظة</p>
<p><a href="${APP_URL}/dashboard">لوحة التحكم</a> &nbsp;·&nbsp; <a href="mailto:support@monshaati.ai">الدعم</a></p>
</div>
</div>
</div>
</body>
</html>`;
}

// ── 1. Welcome ──────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM, to, subject: '🎉 مرحباً بك في منشأتي AI',
    html: shell(`
      <p class="h1">أهلاً ${name}! 👋</p>
      <p class="p">مرحباً بك في <strong>منشأتي AI</strong> — نظام التشغيل الذكي للمنشآت السعودية.</p>
      <div class="box">
        🏗️ هيكل تنظيمي كامل بالذكاء الاصطناعي<br/>
        📜 سياسات وأوصاف وظيفية احترافية<br/>
        📊 مؤشرات أداء KPIs مخصصة<br/>
        🤖 مستشار AI مجاني لمنشأتك
      </div>
      <p class="p">لديك <strong>3 توليدات مجانية</strong>. ابدأ الآن!</p>
      <div style="text-align:center;margin:24px 0"><a href="${APP_URL}/onboarding" class="btn">ابدأ الآن ←</a></div>
    `, 'مرحباً بك — 3 توليدات مجانية في انتظارك'),
  });
}

// ── 2. Trial Started ────────────────────────────────────────
export async function sendTrialStartedEmail(to: string, name: string, trialEnds: string) {
  const end = new Date(trialEnds).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  return resend.emails.send({
    from: FROM, to, subject: '🚀 بدأت تجربتك المجانية — 14 يوماً',
    html: shell(`
      <p class="h1">بدأت تجربتك المجانية! 🚀</p>
      <p class="p">تهانينا <strong>${name}</strong>! لديك الآن وصول كامل لمدة <strong>14 يوماً</strong>.</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-v">14</div><div class="stat-l">يوم تجريبي</div></div>
        <div class="stat"><div class="stat-v">3</div><div class="stat-l">توليدات مجانية</div></div>
        <div class="stat"><div class="stat-v">∞</div><div class="stat-l">استشارات AI</div></div>
      </div>
      <div class="box">📅 تنتهي التجربة في: <strong>${end}</strong></div>
      <div style="text-align:center;margin:24px 0"><a href="${APP_URL}/onboarding" class="btn">أنشئ منشأتك الأولى ←</a></div>
    `, `تجربتك بدأت — تنتهي ${end}`),
  });
}

// ── 3. Trial Expiring ───────────────────────────────────────
export async function sendTrialExpiringEmail(to: string, name: string, daysLeft: number, trialEnds: string) {
  const end = new Date(trialEnds).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const urgent = daysLeft <= 3;
  return resend.emails.send({
    from: FROM, to, subject: `⏰ تجربتك تنتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}`,
    html: shell(`
      <p class="h1">${urgent ? '🚨 عاجل:' : '⏰'} تجربتك تنتهي قريباً</p>
      <p class="p">مرحباً <strong>${name}</strong>،</p>
      <div class="${urgent ? 'warn' : 'box'}">
        ${urgent ? '🚨' : '⏰'} تبقى <strong>${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}</strong> على انتهاء التجربة (${end})
      </div>
      <p class="p">اشترك الآن وحافظ على جميع بياناتك ومنشآتك.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${APP_URL}/pricing" class="btn">اشترك قبل الانتهاء ←</a>
      </div>
      <p class="p" style="text-align:center;font-size:13px">الباقة الأساسية من <strong>99 ريال / شهر</strong></p>
    `, `تجربتك تنتهي خلال ${daysLeft} أيام`),
  });
}

// ── 4. Payment Success ──────────────────────────────────────
export async function sendPaymentSuccessEmail(opts: {
  to: string; name: string; plan: string; amount_sar: number;
  period_end: string; invoice_url?: string;
}) {
  const end = new Date(opts.period_end).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const plans: Record<string, string> = { starter: 'ستارتر', business: 'بيزنس', professional: 'احترافي' };
  return resend.emails.send({
    from: FROM, to: opts.to, subject: '✅ تم تجديد اشتراكك بنجاح',
    html: shell(`
      <p class="h1">✅ تم الدفع بنجاح!</p>
      <p class="p">مرحباً <strong>${opts.name}</strong>، تم تجديد اشتراكك في باقة <strong>${plans[opts.plan] ?? opts.plan}</strong>.</p>
      <div class="box" style="display:flex;justify-content:space-between;align-items:center">
        <div>باقة ${plans[opts.plan] ?? opts.plan}<br/><span style="font-size:12px;color:#6b7280">صالحة حتى ${end}</span></div>
        <div style="font-size:22px;font-weight:800;color:#c8912a">${opts.amount_sar.toLocaleString()} ريال</div>
      </div>
      ${opts.invoice_url ? `<p style="text-align:center"><a href="${opts.invoice_url}" style="color:#c8912a">📄 عرض الفاتورة</a></p>` : ''}
      <div style="text-align:center;margin:24px 0"><a href="${APP_URL}/dashboard" class="btn">الذهاب للوحة التحكم ←</a></div>
    `, `تم الدفع: ${opts.amount_sar} ريال`),
  });
}

// ── 5. Booking Confirmation ─────────────────────────────────
export async function sendBookingConfirmationEmail(opts: {
  to: string; name: string; consultant_name: string;
  duration: string; scheduled_at: string;
  meeting_url?: string; meeting_type?: string; price_sar: number;
}) {
  const dateStr = new Date(opts.scheduled_at).toLocaleString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dur = opts.duration === '30min' ? '30 دقيقة' : '60 دقيقة';
  return resend.emails.send({
    from: FROM, to: opts.to, subject: `📅 تم تأكيد جلستك مع ${opts.consultant_name}`,
    html: shell(`
      <p class="h1">📅 تم تأكيد حجزك!</p>
      <p class="p">مرحباً <strong>${opts.name}</strong>، تم تأكيد جلستك الاستشارية.</p>
      <div class="box">
        👤 المستشار: <strong>${opts.consultant_name}</strong><br/>
        📅 الموعد: <strong>${dateStr}</strong><br/>
        ⏱ المدة: <strong>${dur}</strong><br/>
        💰 المدفوع: <strong>${opts.price_sar.toLocaleString()} ريال</strong>
        ${opts.meeting_url ? `<br/>📹 ${opts.meeting_type === 'zoom' ? 'Zoom' : 'Google Meet'}: <a href="${opts.meeting_url}" style="color:#c8912a">${opts.meeting_url}</a>` : ''}
      </div>
      <div class="ok">💡 احضر مع أسئلة محددة لتستفيد أكثر من جلستك.</div>
      <div style="text-align:center;margin:24px 0">
        <a href="${opts.meeting_url ?? `${APP_URL}/bookings`}" class="btn">
          ${opts.meeting_url ? 'انضم للاجتماع ←' : 'عرض الحجز ←'}
        </a>
      </div>
    `, `تأكيد الجلسة مع ${opts.consultant_name} — ${dateStr}`),
  });
}

// ── 6. Password Reset ───────────────────────────────────────
export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  return resend.emails.send({
    from: FROM, to, subject: '🔑 إعادة تعيين كلمة المرور',
    html: shell(`
      <p class="h1">🔑 إعادة تعيين كلمة المرور</p>
      <p class="p">مرحباً <strong>${name}</strong>، تلقينا طلباً لإعادة تعيين كلمة مرور حسابك.</p>
      <div style="text-align:center;margin:28px 0"><a href="${resetUrl}" class="btn">إعادة تعيين كلمة المرور ←</a></div>
      <div class="warn">⚠️ هذا الرابط صالح لمدة <strong>60 دقيقة</strong> فقط. إذا لم تطلب هذا، تجاهل البريد.</div>
      <div class="div"></div>
      <p class="p" style="font-size:12px;color:#6b7280">إذا لم يعمل الزر: ${resetUrl}</p>
    `, 'إعادة تعيين كلمة المرور — صالح ساعة واحدة'),
  });
}

// ── 7. AI Generation Completed ──────────────────────────────
export async function sendAIGenerationCompletedEmail(opts: {
  to: string; name: string; org_name: string;
  result_url: string; sections: string[];
}) {
  const icons: Record<string, string> = {
    org_chart: '🏗️ الهيكل التنظيمي',
    job_descriptions: '💼 الأوصاف الوظيفية',
    policies: '📜 السياسات',
    kpis: '📊 مؤشرات الأداء',
    hiring_plan: '👤 خطة التوظيف',
  };
  return resend.emails.send({
    from: FROM, to: opts.to, subject: `✨ اكتمل توليد نظام ${opts.org_name}`,
    html: shell(`
      <p class="h1">✨ اكتمل التوليد!</p>
      <p class="p">مرحباً <strong>${opts.name}</strong>، اكتمل توليد نظام التشغيل لمنشأة <strong>${opts.org_name}</strong>.</p>
      <div class="box ok">
        <strong>المحتوى المُوَلَّد:</strong><br/><br/>
        ${opts.sections.map(s => icons[s] ?? s).join('<br/>')}
      </div>
      <p class="p">يمكنك الآن مراجعة النتائج وتصديرها بصيغة PDF أو Word.</p>
      <div style="text-align:center;margin:24px 0"><a href="${opts.result_url}" class="btn">عرض النتائج الكاملة ←</a></div>
    `, `اكتمل توليد ${opts.org_name} — عرض النتائج`),
  });
}
