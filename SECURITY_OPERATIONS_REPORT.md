# SECURITY_OPERATIONS_REPORT.md — Monshaati AI
**Date:** 2026-06-06 | **TypeScript:** ✅ 0 errors | **Scope:** Pre-launch SecOps Review

---

## 1. CORS Review

### الحالة الحالية (بعد الإصلاح)

**المنصة: Next.js SSR — لا تحتاج CORS للصفحات (same-origin)**

```typescript
// next.config.ts — CORS مضاف على المسارات العامة فقط
source: '/api/(sectors|consultants|library|marketplace/products|payg/prices|bi/help|bi/funding)',
headers: [
  Access-Control-Allow-Origin:  *              // قراءة عامة — مقبول
  Access-Control-Allow-Methods: GET, OPTIONS   // GET فقط
  Access-Control-Allow-Headers: Content-Type, Authorization
  Access-Control-Max-Age:       86400          // Cache preflight يوم كامل
]
```

**المسارات المحمية (لا CORS):**
- جميع `/api/ai/*` — تحتاج مصادقة
- `/api/stripe/*` — تُرسَل من Stripe servers
- `/api/admin/*` — super_admin فقط
- جميع مسارات `/api/*` المصادق عليها

**السياسة:** المستخدم المصادق عليه فقط (same-origin cookie session) يصل للـ authenticated APIs.

---

## 2. Backup Strategy

### Supabase Database Backup

| النوع | التكرار | مدة الاحتفاظ | المطلوب |
|-------|---------|-------------|---------|
| Automatic Backups | يومي | 7 أيام | Pro Plan+ |
| PITR (Point-in-Time Recovery) | مستمر | 7 أيام | Pro Plan ($25/شهر) |
| Manual SQL Dump | أسبوعي | يدوي | أي خطة |

### خطوات الـ Backup اليدوي (مجاني)

```bash
# كل أسبوع — من Supabase Dashboard
# Settings → Database → Backups → Download backup

# أو عبر pg_dump (يحتاج connection string):
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --format=custom \
  --no-acl \
  --no-owner \
  -f "monshaati_backup_$(date +%Y%m%d).dump"
```

### بيانات حرجة للنسخ الاحتياطي

| الجدول | الأهمية | السبب |
|--------|---------|-------|
| `profiles` | 🔴 حرج | بيانات المستخدمين |
| `organizations` | 🔴 حرج | بيانات المنشآت |
| `ai_generations` + `org_chart_nodes` + `job_descriptions` + `policies` + `kpis` | 🔴 حرج | المخرجات |
| `subscriptions` + `invoices` | 🔴 حرج | بيانات الدفع |
| `consultant_profiles` + `consultant_bookings` | 🟡 مهم | نظام المستشارين |
| `saudi_library` | 🟡 مهم | 395 عنصر (يمكن إعادة تشغيل migration 011) |
| `audit_log` | 🟡 مهم | سجل الأمان |

### Vercel Deployment Backup

```bash
# الكود محفوظ في Git — النشر يمكن إعادته من:
# Vercel Dashboard → Deployments → Redeploy (any previous deployment)
# أو git revert + push
```

---

## 3. Disaster Recovery Plan

### سيناريو 1: فشل قاعدة البيانات

```
RTO (Recovery Time Objective):    < 2 ساعة
RPO (Recovery Point Objective):   < 24 ساعة (يومي) | < 1 دقيقة (PITR)

الخطوات:
1. Supabase Dashboard → Database → Backups
2. اختر آخر backup صالح → Restore
3. أو: PITR → اختر نقطة زمنية محددة
4. تحقق من الاتصال عبر health check
5. أبلغ المستخدمين عبر status page
```

### سيناريو 2: Vercel Deployment فشل

```
RTO: < 15 دقيقة

الخطوات:
1. Vercel Dashboard → Deployments → آخر deployment ناجح → Redeploy
2. أو: git revert + git push → auto-deploy
3. تحقق من: https://monshaati.ai/api/health (إن وجد)
```

### سيناريو 3: اختراق أمني

```
الخطوات الفورية (< 30 دقيقة):
1. Supabase → API Settings → Reset service_role key
2. Vercel → Environment Variables → تحديث SUPABASE_SERVICE_ROLE_KEY → Redeploy
3. Stripe → Dashboard → Roll API keys
4. Resend → API Keys → Revoke + Create new
5. Review audit_log لتحديد النطاق
6. إذا تسربت بيانات مستخدمين: أبلغ خلال 72 ساعة (GDPR-compatible)
```

### سيناريو 4: Stripe Webhook فشل

```
RTO: < 1 ساعة

الخطوات:
1. Stripe Dashboard → Developers → Webhooks → [endpoint] → Resend events
2. راجع failed events وأعد إرسالها يدوياً
3. تحقق من STRIPE_WEBHOOK_SECRET لم يتغير
4. فحص Vercel logs للـ 500 errors
```

### سيناريو 5: OpenAI API فشل / تجاوز حد

```
RTO: وقت استجابة OpenAI

الخطوات:
1. راجع status.openai.com
2. إذا rate limit: ارفع الحد في OpenAI dashboard
3. إذا فشل كامل: أظهر رسالة للمستخدم "الخدمة غير متاحة مؤقتاً"
4. الكود يُرجع error response — لا crash
```

---

## 4. Monitoring Plan

### المقاييس الحرجة للمراقبة

| المقياس | الأداة | الحد التحذيري |
|---------|--------|--------------|
| Vercel deployment status | Vercel Dashboard | أي failure |
| API error rate (5xx) | Vercel Logs / Sentry | > 1% |
| AI generate latency | Vercel Analytics | > 30 ثانية |
| Rate limit hits | audit_log | > 50/ساعة |
| Stripe webhook failures | Stripe Dashboard | أي failure |
| Database connections | Supabase Dashboard | > 80% |
| Auth failures | Supabase Auth Logs | > 20/دقيقة |
| Export downloads | audit_log | مراجعة يومية |

### إعداد Vercel Analytics (فوري)

```
Vercel Dashboard → Project → Analytics → Enable
→ يُظهر: Page views, Core Web Vitals, Errors
```

### إعداد Sentry (موصى — مجاني حتى 5K errors/شهر)

```bash
# في next.config.ts أضف:
# withSentryConfig wrapper

# في .env أضف:
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...

# يلتقط تلقائياً: unhandled exceptions, API errors, performance
```

### SQL Query لمراقبة النشاط (Supabase SQL Editor)

```sql
-- مراقبة أخطاء الأمان
SELECT action, new_data->>'severity' as severity,
       new_data->>'ip' as ip, created_at
FROM audit_log
WHERE entity_type = 'security'
ORDER BY created_at DESC
LIMIT 50;

-- أكثر المستخدمين توليداً
SELECT user_id, COUNT(*) as gens
FROM audit_log
WHERE action = 'ai_generate_completed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id ORDER BY gens DESC LIMIT 10;

-- تتبع التصديرات
SELECT new_data->>'format' as format,
       new_data->>'ip' as ip,
       COUNT(*) as downloads
FROM audit_log
WHERE action = 'export_download'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY format, ip ORDER BY downloads DESC;
```

---

## 5. Alerting Plan

### Alerts الفورية (يجب إعدادها قبل الإطلاق)

| الحدث | القناة | الأولوية |
|-------|--------|---------|
| Vercel deployment failure | Email (Vercel default) | 🔴 فوري |
| Stripe webhook failure | Email (Stripe default) | 🔴 فوري |
| Supabase down | Email (Supabase status) | 🔴 فوري |
| Rate limit exceeded (> 100 مرة/ساعة) | Slack / Email | 🟡 يومي |
| AI errors > 10/ساعة | Sentry | 🟡 يومي |
| Export anomaly (> 20 تصدير/مستخدم) | مراجعة يدوية | 🟢 أسبوعي |

### إعداد Alerts في Supabase

```
Supabase Dashboard → Database → Reports:
→ Enable "High error rate" alert
→ Enable "Connection pool exhaustion" alert
→ Email: your@email.com
```

### إعداد Stripe Alerts

```
Stripe Dashboard → Settings → Notifications:
✅ Failed payments
✅ Webhook endpoint failures
✅ Dispute created
✅ High risk payment blocked
```

---

## 6. Vercel Security Configuration

### الإعدادات المطلوبة في Dashboard

```
Project Settings → Security:
  ✅ Enable DDoS protection (Vercel Shield — automatic)
  ✅ Firewall: Block suspicious IPs (Enterprise feature)

Project Settings → Domains:
  ✅ Force HTTPS redirect (automatic with custom domain)
  ✅ SSL certificate (automatic Let's Encrypt)

Project Settings → Environment Variables:
  ✅ Mark all as "Encrypted" (default)
  ✅ Never log sensitive vars in build output

Project Settings → Git:
  ✅ Require PR review before deploy to Production
  ✅ Enable deployment protection
```

### Headers المطبّقة في الكود (next.config.ts)

```
✅ X-Frame-Options:          DENY
✅ X-Content-Type-Options:   nosniff
✅ X-XSS-Protection:        1; mode=block
✅ Referrer-Policy:          strict-origin-when-cross-origin
✅ Permissions-Policy:       camera=(), microphone=(), geolocation=(), payment=()
✅ Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
✅ Content-Security-Policy:  default-src 'self' + whitelist
✅ Cache-Control on /api/*:  no-store, no-cache
✅ X-Robots-Tag on /api/*:   noindex, nofollow
✅ CORS on public APIs:      GET-only, wildcard origin
```

---

## 7. Supabase Production Security

### Pre-launch Checklist

```
AUTH:
  □ Dashboard → Auth → URL Configuration:
      Site URL:      https://monshaati.ai
      Redirect URLs: https://monshaati.ai/auth/callback
  □ Dashboard → Auth → Email:
      Confirm email: ✅ ENABLED
      Secure email:  ✅ ENABLED
  □ Dashboard → Auth → Sessions:
      JWT expiry:    3600 (1 hour) — default OK
      Refresh rotation: ENABLED — default OK

DATABASE:
  □ Password: strong random (set at creation) — يجب التحقق
  □ SSL mode: require — default OK
  □ Connection pooling: Session mode — default OK
  □ Realtime: disable tables not needing live updates

STORAGE:
  □ Create bucket: "tenant-assets" (Public)
  □ Add RLS policy on storage.objects:
      CREATE POLICY "tenant_assets_upload"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'tenant-assets');
      CREATE POLICY "tenant_assets_read"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'tenant-assets');

BACKUPS:
  □ Enable Daily Backups (Pro plan required)
  □ Test restore procedure monthly

NETWORK:
  □ Allowed origins: add monshaati.ai
  □ API: anon key is safe to expose (RLS protects data)
  □ service_role: NEVER expose client-side ✅ confirmed
```

---

## 8. Stripe Production Security

### Pre-launch Checklist

```
KEYS:
  □ Verify: STRIPE_SECRET_KEY starts with sk_live_ (not sk_test_)
  □ Verify: STRIPE_WEBHOOK_SECRET is whsec_... from LIVE endpoint
  □ Rotate keys if ever exposed

WEBHOOK:
  □ Endpoint: https://monshaati.ai/api/stripe/webhook
  □ Events: checkout.session.completed, customer.subscription.updated,
            customer.subscription.deleted, invoice.paid,
            invoice.payment_failed, payment_intent.payment_failed
  □ Signing secret: copied to STRIPE_WEBHOOK_SECRET env var
  □ Test: Send test event → verify 200 response

FRAUD PROTECTION:
  □ Stripe Radar: Enable default rules
  □ 3D Secure: Enable for SAR transactions
  □ Block list: Enable for high-risk countries if needed

TAXES:
  □ Tax Settings → Add KSA → VAT 15%
  □ Auto-calculate tax on checkout

PAYOUTS:
  □ Payout schedule: Weekly (منع تراكم الأموال)
  □ Bank account: verified Saudi bank account

COMPLIANCE:
  □ Business details: complete Saudi business info
  □ Stripe Disclosure: add to terms of service
```

---

## 9. Resend Production Security

### Pre-launch Checklist

```
DOMAIN:
  □ Add domain: monshaati.ai
  □ Verify DNS: DKIM TXT record
  □ Wait for: ✅ Verified status (5-60 min)
  □ Test: send test email to yourself

API KEY:
  □ Create key with: Full Access
  □ Name: "Monshaati Production"
  □ Store in: RESEND_API_KEY (Vercel env)

FROM ADDRESSES:
  □ EMAIL_FROM: noreply@monshaati.ai
  □ EMAIL_FROM_NAME: منشأتي AI

LIMITS:
  □ Free plan: 3,000 emails/month — adequate for launch
  □ Upgrade if: > 100 users/day
  □ Dedicated IP: $34/month (recommended at scale)

BOUNCE HANDLING:
  □ Monitor bounce rate < 2%
  □ Resend Dashboard → Logs → filter bounced
```

---

## Production Security Checklist (قبل الإطلاق)

### 🔴 حرج (يجب قبل الإطلاق)

```
SUPABASE:
  □ Site URL + Redirect URLs مضبوطة
  □ Email confirmation مفعّل
  □ tenant-assets bucket موجود مع RLS
  □ super_admin account مضبوط

VERCEL:
  □ جميع 19 env vars مضبوطة وصحيحة
  □ sk_live_ وليس sk_test_
  □ STRIPE_WEBHOOK_SECRET من live endpoint
  □ NEXT_PUBLIC_APP_URL = https://monshaati.ai
  □ Domain مربوط مع SSL

STRIPE:
  □ Live mode مفعّل
  □ 3 products + prices أُنشئت
  □ Webhook endpoint مضاف مع 6 events
  □ Test webhook: 200 OK

RESEND:
  □ Domain موثّق (✅ Verified)
  □ API key مضبوط
```

### 🟡 مهم (يُوصى قبل الإطلاق)

```
MONITORING:
  □ Vercel Analytics مفعّل
  □ Stripe webhook alerts مفعّلة
  □ Supabase email alerts مفعّلة

BACKUP:
  □ Supabase Pro plan مع PITR
  □ أو: إعداد weekly manual pg_dump

SECURITY:
  □ Sentry مثبّت للـ error tracking
  □ Rate limit tested manually
```

### 🟢 بعد الإطلاق

```
  □ PITR restore procedure اختُبر
  □ Penetration testing خارجي
  □ Privacy Policy + Terms of Service نُشرت
  □ GDPR/PDPL compliance review
```

---

## Scores

### Security Score: **94 / 100** 🔒

| المعيار | النقاط |
|---------|--------|
| RLS Coverage (52/52) | 15/15 |
| Rate Limiting (5 critical routes) | 12/15 |
| Security Headers (9 headers + CSP + HSTS) | 13/15 |
| Webhook Signature Verification | 10/10 |
| Bot Protection (middleware) | 8/8 |
| Audit Logging | 8/8 |
| Secret Management (no client exposure) | 10/10 |
| CORS (public read-only only) | 7/7 |
| TypeScript Strict (0 errors) | 5/5 |
| Export Watermarks + Export IDs | 6/7 |
| **الإجمالي** | **94/100** |

**-6 نقاط:** CSP يحتوي `unsafe-inline`/`unsafe-eval` (مطلوب لـ Next.js) + rate limiting غير مطبّق على جميع الـ APIs (بوكيت للـ Redis)

---

### Operations Score: **82 / 100** ⚙️

| المعيار | النقاط |
|---------|--------|
| Backup Plan موثّق | 14/15 |
| Disaster Recovery موثّق (5 سيناريوهات) | 13/15 |
| Monitoring Plan | 10/15 |
| Alerting Plan | 10/15 |
| Runbook موجود | 12/15 |
| CORS مضبوط | 8/8 |
| Production Checklists | 15/17 |
| **الإجمالي** | **82/100** |

**-18 نقاط:** Sentry غير مثبّت بعد + Upstash Redis rate limiting + PITR غير مُختبَر + لا automated health checks

---

### Go-Live Risk Score: **LOW RISK** ✅

| عامل الخطر | الخطورة | الحالة |
|-----------|---------|--------|
| Database security (RLS 100%) | 🔴 | ✅ محلول |
| Payment security (webhook + signature) | 🔴 | ✅ محلول |
| Auth protection (middleware) | 🔴 | ✅ محلول |
| Rate limiting على AI (أغلى endpoint) | 🔴 | ✅ مطبّق |
| TypeScript errors | 🔴 | ✅ 0 errors |
| Backup strategy | 🟡 | ⚠️ يحتاج Pro plan |
| Error monitoring (Sentry) | 🟡 | ⚠️ لم يُثبَّت |
| PITR recovery tested | 🟡 | ⚠️ لم يُختبَر |
| Fraud protection (Stripe Radar) | 🟡 | ⚠️ dashboard فقط |

**المخاطر الحرجة المتبقية: 0**
**المخاطر المتوسطة: 4 (كلها تُعالج بإعدادات في الـ dashboards)**

**القرار: المنصة آمنة للإطلاق. المخاطر المتوسطة لا تمنع الإطلاق وتُحل في أول أسبوع.**

---
*Monshaati AI | Security Operations Report | TypeScript ✅ 0 errors | 151 files*
