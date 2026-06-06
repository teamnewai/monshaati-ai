# PRODUCTION_DEPLOYMENT_CHECKLIST.md — Monshaati AI
**آخر تحديث:** 2026-06-05 | مبني على قراءة الكود مباشرة

---

## 1. Environment Variables — الكاملة من الكود

19 متغير — كلها مطلوبة للإطلاق الكامل (16 حرجة، 3 اختيارية للـ meetings)

```bash
# ============================================================
# SUPABASE — حرجة (المنصة لا تعمل بدونها)
# ============================================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================
# OPENAI — حرجة (AI generation + AI consultant لا يعمل بدونها)
# ============================================================
OPENAI_API_KEY=sk-proj-...

# ============================================================
# STRIPE — حرجة (المدفوعات لا تعمل بدونها)
# ============================================================
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...      # 99 SAR/شهر
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_... # 299 SAR/شهر
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...   # 799 SAR/شهر

# ملاحظة: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY غير مستخدم في الكود
# (الـ checkout server-side فقط) — لا داعي له

# ============================================================
# RESEND — مهمة (الإيميلات لا ترسل بدونها)
# ============================================================
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@monshaati.ai       # يجب مطابقة domain موثق في Resend
EMAIL_FROM_NAME=منشأتي AI

# ============================================================
# APP URL — حرجة (redirect URLs في Stripe + email links)
# ============================================================
NEXT_PUBLIC_APP_URL=https://monshaati.ai     # بدون trailing slash

# ============================================================
# ZOOM — اختيارية (الحجز يعمل بدون Zoom لكن بلا رابط اجتماع)
# ============================================================
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
ZOOM_ACCOUNT_ID=...

# ============================================================
# GOOGLE MEET — اختيارية (كـ Zoom)
# ============================================================
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=1//...
```

---

## 2. مفاتيح الخدمات المطلوبة

| الخدمة | المفتاح | أين تجده |
|--------|---------|---------|
| Supabase | URL + Anon Key + Service Role | Project → Settings → API |
| OpenAI | API Key | platform.openai.com → API Keys |
| Stripe | Secret Key + Webhook Secret + 3 Price IDs | dashboard.stripe.com |
| Resend | API Key | resend.com → API Keys |
| Zoom | Client ID + Secret + Account ID | marketplace.zoom.us |
| Google | Client ID + Secret + Refresh Token | console.cloud.google.com |

---

## 3. ترتيب تنفيذ الـ Migrations (إلزامي)

```
001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011
```

**لماذا هذا الترتيب؟**
- `001` ينشئ كل الجداول الأساسية (profiles, organizations, ai_generations...)
- `002` يُضيف بيانات sectors (يعتمد على جدول sectors من 001)
- `003` يُضيف الجداول الجديدة للمرحلة 2 ويُعدّل organizations و profiles
- `004` يُضيف بيانات saudi_library (يعتمد على جدول saudi_library من 003)
- `005` ينشئ جداول BI (cost_models, financial_records...) — تعتمد على organizations
- `006` يُضيف بيانات funding_programs (يعتمد على جدول funding_programs من 005)
- `007` يُضيف بيانات help_definitions (يعتمد على جدول help_definitions من 005)
- `008` يُعدّل tenants ويُضيف tenant_members, tenant_activity...
- `009` ينشئ consultant_conversations, consultant_messages
- `010` يُعدّل consultant_profiles ويُضيف consultant_payouts
- `011` يحذف ويُعيد إدراج saudi_library بـ 395 عنصر

**ملاحظة:** جميع الـ migrations أصبحت idempotent — يمكن تشغيلها أكثر من مرة بأمان.

---

## 4. خطوات Supabase Production

### أ. إنشاء المشروع
```
1. supabase.com → New Project
2. اختر Region: Middle East (Bahrain) me-central-1 — الأقرب للسوق السعودي
3. Database Password: احفظه (لن تحتاجه لكن لا تنساه)
4. انتظر ~2 دقيقة للإعداد
```

### ب. تشغيل الـ Migrations
```
Dashboard → SQL Editor → New Query

— شغّل كل ملف بالترتيب (001 → 011):
— انسخ المحتوى → Run → تأكد "Success" قبل التالي

تحقق بعد كل migration:
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- يجب أن يزيد العدد مع كل migration
```

### ج. إعداد Authentication
```
Dashboard → Authentication → URL Configuration:
  Site URL: https://monshaati.ai
  Redirect URLs: https://monshaati.ai/auth/callback

Dashboard → Authentication → Email Templates:
  Confirm signup: فعّله
  Email من: noreply@monshaati.ai (أو اترك Supabase default)

Dashboard → Authentication → Providers:
  Email: ✅ مفعّل (افتراضي)
  Confirm email: ✅ مفعّل
```

### د. إنشاء Super Admin
```sql
-- بعد أول تسجيل بحسابك:
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'admin@yourdomain.com';
```

### هـ. إنشاء Storage Bucket
```
Dashboard → Storage → New Bucket:
  Name: tenant-assets
  Public: ✅ YES (logos يجب أن تكون عامة)
  
Dashboard → Storage → Policies → tenant-assets:
  أضف policy: Allow authenticated users to upload
  أضف policy: Allow public read
```

### و. أخذ بيانات الاتصال
```
Dashboard → Settings → API:
  Project URL      → NEXT_PUBLIC_SUPABASE_URL
  anon public      → NEXT_PUBLIC_SUPABASE_ANON_KEY
  service_role     → SUPABASE_SERVICE_ROLE_KEY (سري — لا تشاركه)
```

---

## 5. خطوات Vercel Production

### أ. ربط المشروع
```
1. vercel.com → Import Git Repository
2. اختر GitHub repo
3. Framework: Next.js (auto-detected)
4. Root Directory: . (الجذر)
```

### ب. إضافة Environment Variables
```
Project → Settings → Environment Variables → Add

أضف كل المتغيرات التالية مع تحديد:
Environment: Production (و Preview إن أردت)

NEXT_PUBLIC_SUPABASE_URL          = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = eyJ...
SUPABASE_SERVICE_ROLE_KEY         = eyJ...
OPENAI_API_KEY                    = sk-proj-...
STRIPE_SECRET_KEY                 = sk_live_...
STRIPE_WEBHOOK_SECRET             = whsec_...  ← بعد إنشاء webhook في Stripe
STRIPE_STARTER_MONTHLY_PRICE_ID   = price_...
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID   = price_...
RESEND_API_KEY                    = re_...
EMAIL_FROM                        = noreply@monshaati.ai
EMAIL_FROM_NAME                   = منشأتي AI
NEXT_PUBLIC_APP_URL               = https://monshaati.ai
ZOOM_CLIENT_ID                    = ...
ZOOM_CLIENT_SECRET                = ...
ZOOM_ACCOUNT_ID                   = ...
GOOGLE_CLIENT_ID                  = ...
GOOGLE_CLIENT_SECRET              = ...
GOOGLE_REFRESH_TOKEN              = 1//...
```

### ج. إعداد Domain
```
Project → Settings → Domains:
  Add: monshaati.ai
  Add: www.monshaati.ai → Redirect to monshaati.ai
  
في DNS provider:
  A record: @ → 76.76.21.21 (Vercel IP)
  CNAME: www → cname.vercel-dns.com
```

### د. Deploy
```
git push origin main  →  يبدأ auto-deploy تلقائياً

تحقق:
  Vercel → Deployments → آخر deploy → Functions Log
  لا يجب أن تظهر أخطاء في build
```

### هـ. تحديث vercel.json (مهم)
```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "OPENAI_API_KEY": "@openai_api_key",
    "STRIPE_SECRET_KEY": "@stripe_secret_key",
    "STRIPE_WEBHOOK_SECRET": "@stripe_webhook_secret",
    "STRIPE_STARTER_MONTHLY_PRICE_ID": "@stripe_starter_monthly_price_id",
    "STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID": "@stripe_professional_monthly_price_id",
    "STRIPE_ENTERPRISE_MONTHLY_PRICE_ID": "@stripe_enterprise_monthly_price_id",
    "RESEND_API_KEY": "@resend_api_key",
    "EMAIL_FROM": "@email_from",
    "EMAIL_FROM_NAME": "@email_from_name",
    "NEXT_PUBLIC_APP_URL": "@next_public_app_url",
    "ZOOM_CLIENT_ID": "@zoom_client_id",
    "ZOOM_CLIENT_SECRET": "@zoom_client_secret",
    "ZOOM_ACCOUNT_ID": "@zoom_account_id",
    "GOOGLE_CLIENT_ID": "@google_client_id",
    "GOOGLE_CLIENT_SECRET": "@google_client_secret",
    "GOOGLE_REFRESH_TOKEN": "@google_refresh_token"
  }
}
```

---

## 6. خطوات Stripe Live

### أ. إنشاء المنتجات والأسعار
```
dashboard.stripe.com → Products → + Add product

المنتج 1: منشأتي AI — ستارتر
  Name: منشأتي AI — Starter
  Pricing: Recurring | 99.00 SAR | Monthly
  → Copy Price ID → STRIPE_STARTER_MONTHLY_PRICE_ID

المنتج 2: منشأتي AI — بيزنس
  Name: منشأتي AI — Business
  Pricing: Recurring | 299.00 SAR | Monthly
  → Copy Price ID → STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID

المنتج 3: منشأتي AI — احترافي
  Name: منشأتي AI — Professional
  Pricing: Recurring | 799.00 SAR | Monthly
  → Copy Price ID → STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
```

### ب. إنشاء Webhook
```
dashboard.stripe.com → Developers → Webhooks → + Add endpoint

Endpoint URL: https://monshaati.ai/api/stripe/webhook

Events to listen (6 events — اخترها جميعها):
  ✅ checkout.session.completed
  ✅ customer.subscription.updated
  ✅ customer.subscription.deleted
  ✅ invoice.paid
  ✅ invoice.payment_failed
  ✅ payment_intent.payment_failed

بعد الإنشاء:
  → Signing secret → Reveal → انسخ → STRIPE_WEBHOOK_SECRET
```

### ج. تفعيل SAR (Saudi Riyal)
```
dashboard.stripe.com → Settings → Business settings:
  Country: Saudi Arabia
  Currency: SAR

(إذا لم يكن SAR متاحاً مباشرة، تواصل مع Stripe support لتفعيله)
```

### د. اختبار Webhook
```
Stripe Dashboard → Webhooks → [webhook URL] → Send test event
  اختر: checkout.session.completed
  يجب أن يرجع: 200 OK
```

### هـ. Stripe Connect (للمستشارين)
```
dashboard.stripe.com → Settings → Connect:
  Enable Connect: ✅
  Platform name: منشأتي AI
  
Connect → Settings:
  Express accounts: Enable for Saudi Arabia
  
(مطلوب: business verification من Stripe — قد تستغرق 1-3 أيام)
```

---

## 7. خطوات Resend

### أ. إنشاء حساب وتوثيق الدومين
```
1. resend.com → Sign Up
2. Domains → Add Domain: monshaati.ai

أضف في DNS provider:
  TXT: resend._domainkey.monshaati.ai → [قيمة DKIM من Resend]
  MX:  inbound.resend.com (للـ inbound emails اختياري)
  
انتظر 5-60 دقيقة للتحقق (✅ Verified)
```

### ب. إنشاء API Key
```
API Keys → + Create API Key
  Name: Monshaati Production
  Permission: Full Access
  
→ انسخ → RESEND_API_KEY
```

### ج. قيم متغيرات البيئة
```
EMAIL_FROM=noreply@monshaati.ai
EMAIL_FROM_NAME=منشأتي AI
```

### د. اختبار الإرسال
```bash
# بعد النشر، اختبر من Vercel Functions logs:
POST https://monshaati.ai/api/email
{
  "type": "welcome",
  "payload": { "to": "test@test.com" }
}
```

### هـ. اختبار بديل (قبل توثيق الدومين)
```
EMAIL_FROM=onboarding@resend.dev  ← يعمل مباشرة بدون domain verification
(استخدمه للاختبار الأولي فقط)
```

---

## 8. خطوات Zoom

### أ. إنشاء Server-to-Server OAuth App
```
1. marketplace.zoom.us → Develop → Build App
2. اختر: Server-to-Server OAuth
3. App Name: Monshaati AI
4. Click Create

من صفحة App Credentials:
  Account ID    → ZOOM_ACCOUNT_ID
  Client ID     → ZOOM_CLIENT_ID
  Client Secret → ZOOM_CLIENT_SECRET

Scopes (أضف هذه):
  ✅ meeting:write:admin
  ✅ meeting:read:admin
  ✅ user:read:admin

→ Activate App
```

### ب. اختبار الاتصال
```
يعمل تلقائياً عند أول حجز مكتمل (بعد Stripe payment)
تحقق من: consultant_bookings.meeting_url في Supabase
```

### ج. ملاحظة مهمة
```
الكود يستخدم: grant_type=account_credentials
هذا يعمل مع Server-to-Server OAuth فقط
لا تستخدم OAuth app عادي (لا يدعم server-to-server)
```

---

## 9. خطوات Google Meet

### أ. إنشاء OAuth 2.0 Credentials
```
1. console.cloud.google.com → New Project: Monshaati AI
2. APIs & Services → Enable APIs:
   ✅ Google Calendar API
   
3. APIs & Services → Credentials → Create Credentials:
   → OAuth 2.0 Client ID
   → Application type: Web application
   → Name: Monshaati AI
   → Authorized redirect URIs: https://developers.google.com/oauthplayground

GOOGLE_CLIENT_ID     ← من صفحة Credentials
GOOGLE_CLIENT_SECRET ← من صفحة Credentials
```

### ب. الحصول على Refresh Token (مرة واحدة)
```
1. oauth2.googleapis.com/oauth2playground
   → Settings (⚙️) → Use your own OAuth credentials → أدخل Client ID + Secret

2. Step 1 — اختر scope:
   https://www.googleapis.com/auth/calendar

3. Authorize APIs → وقّع بحساب Google المراد استخدامه

4. Step 2 → Exchange authorization code for tokens
   → انسخ Refresh Token → GOOGLE_REFRESH_TOKEN

ملاحظة: Refresh Token لا ينتهي ما لم تُلغِه
```

### ج. OAuth Consent Screen
```
APIs & Services → OAuth consent screen:
  User Type: External (أو Internal إذا كنت تستخدم Google Workspace)
  App name: منشأتي AI
  Support email: support@monshaati.ai
  Scopes: calendar
  Test users: أضف بريدك للاختبار

(إذا لم تحصل على مراجعة Google، اترك في "Testing" — يعمل لكن فقط لـ test users)
```

---

## 10. موانع تقنية للإطلاق

### ✅ لا يوجد مانع تقني — الكود جاهز

**ما تم إصلاحه قبل هذه القائمة:**
- ✅ Duplicate triggers في 005_bi_layer.sql → محلول
- ✅ جميع الـ migrations idempotent الآن
- ✅ TypeScript: 0 أخطاء

**ما يحتاج إعداد (ليس تطوير):**

| البند | الوقت التقديري | الحالة |
|-------|----------------|--------|
| Supabase: إنشاء مشروع + migrations | 30 دقيقة | ⬜ |
| Vercel: نشر + env vars | 20 دقيقة | ⬜ |
| Stripe: منتجات + webhook + SAR | 30 دقيقة | ⬜ |
| Resend: domain + API key | 15 دقيقة + انتظار DNS | ⬜ |
| Supabase: super_admin SQL | 2 دقيقة | ⬜ |
| Supabase: Storage bucket | 5 دقيقة | ⬜ |
| Zoom: Server-to-Server app | 20 دقيقة | ⬜ (اختياري) |
| Google Meet: OAuth + refresh | 30 دقيقة | ⬜ (اختياري) |

**إجمالي الوقت المطلوب:** ساعة ونصف (بدون Zoom/Meet)

---

## 11. ترتيب الإطلاق المُوصى

```
المرحلة 1 — الجوهر (يومان):
  □ Supabase: مشروع + migrations + auth + super_admin + bucket
  □ Vercel: deploy + domain + env vars (Supabase + OpenAI فقط)
  □ تحقق: https://monshaati.ai → تسجيل → توليد AI → نتائج

المرحلة 2 — المدفوعات (يوم):
  □ Stripe: منتجات + webhook
  □ أضف Stripe env vars في Vercel → redeploy
  □ تحقق: checkout → payment → subscription

المرحلة 3 — الإيميلات (يوم):
  □ Resend: domain verification + API key
  □ أضف Resend env vars في Vercel → redeploy
  □ تحقق: welcome email + payment confirmation

المرحلة 4 — الاجتماعات (اختياري):
  □ Zoom: Server-to-Server OAuth
  □ Google Meet: OAuth + refresh token
  □ تحقق: حجز مستشار → Stripe → رابط Zoom

المرحلة 5 — أول عميل:
  □ شارك الرابط
  □ راقب Vercel logs + Supabase
  □ تأكد من admin@... لديه role = 'super_admin'
```

---

## 12. Checklist النهائية قبل أول عميل

```
SUPABASE:
  □ جميع 11 migration شُغّلت بنجاح
  □ Auth → Site URL = https://monshaati.ai
  □ Auth → Redirect URLs = https://monshaati.ai/auth/callback
  □ Storage bucket "tenant-assets" موجود وـ Public
  □ super_admin مُضبوط لحسابك

VERCEL:
  □ جميع 19 env var مُضبوطة
  □ Domain = monshaati.ai مُفعّل بـ SSL
  □ آخر deployment = Success

STRIPE:
  □ 3 products/prices أُنشئت
  □ Webhook endpoint مضاف
  □ 6 events مُحددة في webhook
  □ STRIPE_WEBHOOK_SECRET مُضبوط في Vercel

RESEND:
  □ Domain موثق (✅ Verified)
  □ API key مُضبوط في Vercel

TEST:
  □ تسجيل حساب جديد يعمل
  □ توليد AI يعمل (org chart يظهر)
  □ تصدير PDF يعمل
  □ Stripe checkout يعمل
  □ إيميل التأكيد يُرسَل
  □ /admin يعمل فقط مع super_admin
```

---
*Monshaati AI Production Checklist | TypeScript ✅ 0 errors | Migrations ✅ Idempotent*
