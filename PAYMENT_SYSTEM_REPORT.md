# PAYMENT SYSTEM REPORT — Monshaati AI
**Date:** 2026-06-04  
**System:** Stripe Subscriptions SaaS

---

## الوضع قبل الإضافة

لم يكن هناك نظام مدفوعات فعلي. الكود كان يحتوي فقط على:
- حقل `subscription_plan` في جدول `organizations` (بدون منطق فعلي)
- لا توجد بوابة دفع
- لا توجد صفحات اشتراك
- لا توجد قيود على الاستخدام

---

## ما تم بناؤه

### 1. الملفات الجديدة (9 ملفات)

| الملف | الوظيفة |
|-------|---------|
| `src/lib/stripe.ts` | Stripe client + plan mappings |
| `src/lib/subscription.ts` | منطق الاشتراك وقيود الاستخدام |
| `src/app/pricing/page.tsx` | صفحة الباقات والأسعار |
| `src/app/billing/page.tsx` | صفحة الفوترة والفواتير |
| `src/app/api/stripe/checkout/route.ts` | POST: إنشاء Stripe Checkout Session |
| `src/app/api/stripe/webhook/route.ts` | POST: معالجة Stripe Webhooks |
| `src/app/api/stripe/portal/route.ts` | POST: فتح Customer Portal |
| `src/app/api/stripe/subscription/route.ts` | GET: حالة الاشتراك |
| `src/app/api/stripe/invoices/route.ts` | GET: قائمة الفواتير |

### 2. الملفات المعدّلة

| الملف | التعديل |
|-------|---------|
| `src/app/api/ai/generate/route.ts` | إضافة فحص الاشتراك قبل التوليد |
| `src/middleware.ts` | `/pricing` public + webhook public |
| `src/components/layout/Navbar.tsx` | إضافة رابط "اشتراكي" |
| `src/types/database.ts` | إضافة Subscription/Invoice/PLAN_LIMITS types |
| `supabase/migrations/001_initial_schema.sql` | إضافة جداول subscriptions + invoices + usage_tracking |
| `.env.example` | إضافة Stripe environment variables |
| `package.json` | إضافة stripe + @stripe/stripe-js |

---

## الباقات الثلاث

| الباقة | السعر | التوليدات/شهر | المنشآت | المستخدمون |
|--------|-------|--------------|---------|-----------|
| **ستارتر** (Starter) | 99 ريال/شهر | 15 | 3 | 5 |
| **بيزنس** (Business) | 299 ريال/شهر | 50 | 10 | 20 |
| **احترافي** (Professional) | 799 ريال/شهر | غير محدود | غير محدود | غير محدود |
| **تجريبي** (Free Trial) | مجاني | 3 | 1 | 1 |

---

## Webhook Events المعالَجة

| Event | الإجراء |
|-------|---------|
| `checkout.session.completed` | إنشاء subscription record، تحديث org plan |
| `customer.subscription.updated` | تحديث plan + status + period |
| `customer.subscription.deleted` | تعيين status = canceled، إعادة لـ free_trial |
| `invoice.paid` | حفظ Invoice في DB |
| `invoice.payment_failed` | تعيين status = past_due |

---

## جداول قاعدة البيانات المضافة

### subscriptions
```sql
id, org_id, user_id, stripe_customer_id, stripe_subscription_id,
stripe_price_id, plan, status, current_period_start, current_period_end,
cancel_at_period_end, canceled_at, trial_end, created_at, updated_at
```

### invoices
```sql
id, org_id, subscription_id, stripe_invoice_id, stripe_payment_intent,
amount_paid, amount_due, currency, status, invoice_pdf, hosted_invoice_url,
period_start, period_end, paid_at, created_at
```

### usage_tracking
```sql
id, org_id, period_start, period_end, generations_used, limit_reached,
created_at, updated_at
```

جميع الجداول محمية بـ Row Level Security.

---

## كيفية التشغيل

### 1. إعداد Stripe Dashboard

```
1. stripe.com → Create Account
2. Developers → API Keys → انسخ publishable + secret keys
3. Products → Add Product → "Monshaati AI Starter"
   → Add Price → Recurring → 99 SAR / month
   → انسخ Price ID (price_xxx)
4. كرّر لـ Business (299) و Professional (799)
5. Developers → Webhooks → Add endpoint
   → URL: https://your-domain.com/api/stripe/webhook
   → Events: checkout.session.completed, customer.subscription.updated,
              customer.subscription.deleted, invoice.paid, invoice.payment_failed
   → انسخ Webhook Signing Secret
```

### 2. Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
```

### 3. تشغيل Webhook محلياً (للتطوير)

```bash
npm install -g stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 4. اختبار الدفع

```bash
# بطاقة اختبار ناجحة
Number: 4242 4242 4242 4242
Date: Any future date
CVC: Any 3 digits

# بطاقة رفض
Number: 4000 0000 0000 0002

# بطاقة 3D Secure
Number: 4000 0025 0000 3155
```

---

## User Flow

```
/pricing → اختيار باقة → Stripe Checkout → success → /billing
                                          ↓
                                   Webhook: checkout.session.completed
                                          ↓
                                   DB: subscriptions upserted
                                   DB: org.subscription_plan updated
```

```
/billing → "إدارة الاشتراك" → Stripe Customer Portal
         → إلغاء/تغيير → Webhook → DB updated
```

```
/onboarding (AI Generate) → canGenerateAI() check
  ├── allowed → generateOrgSystem() → incrementUsage()
  └── blocked → 402: { error: 'generation_limit_reached', upgrade_url: '/billing' }
```

---

## TypeScript Status: ✅ 0 errors

جميع الملفات الجديدة تمر من tsc --noEmit بدون أخطاء.

---

*Monshaati AI Payment System — Built with Stripe*
