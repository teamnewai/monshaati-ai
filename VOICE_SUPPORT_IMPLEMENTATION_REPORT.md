# VOICE_SUPPORT_IMPLEMENTATION_REPORT.md — Monshaati AI
**Date:** 2026-06-06 | **TypeScript:** ✅ 0 errors | **Files:** 159 | **APIs:** 67

---

## الجداول الجديدة (Migration 012) — 3 جداول

| الجدول | الوظيفة | RLS |
|--------|---------|-----|
| `support_agents` | وكلاء الدعم مع الحالة والتحميل الحالي | ✅ admin + self |
| `support_tickets` | تذاكر الدعم من جميع القنوات | ✅ own + admin |
| `ticket_messages` | رسائل المحادثة داخل كل تذكرة | ✅ ticket-scoped |
| `support_calls` | سجل المكالمات الصوتية وطلبات الرد | ✅ own + admin |

### ENUM Types الجديدة:
```sql
ticket_status:   open | in_progress | waiting | resolved | closed
ticket_priority: low | medium | high | urgent
ticket_channel:  chat | email | voice | callback | web
call_status:     requested | queued | in_progress | completed | missed | failed
agent_status:    available | busy | offline | break
```

### Functions و Triggers:
- **`generate_ticket_number()`** → `TKT-20250606-1001` (sequence-based)
- **`auto_assign_ticket()`** → يُسند التذكرة تلقائياً لأقل الوكلاء تحميلاً وأعلاهم تقييماً
- Triggers: `upd_agents`, `upd_tickets`, `upd_calls` (update_updated_at)
- Trigger: `on_ticket_created` (generate number)
- Trigger: `on_ticket_assign` (auto-assign)

---

## APIs الجديدة (6 routes)

| Route | Methods | الوظيفة |
|-------|---------|---------|
| `/api/support/tickets` | GET, POST, PATCH | إنشاء تذكرة · قائمة تذاكر المستخدم · تقييم / إغلاق |
| `/api/support/messages` | GET, POST | رسائل التذكرة · إرسال رد |
| `/api/support/calls` | GET, POST | طلب مكالمة / callback · قائمة مكالمات المستخدم |
| `/api/support/agents` | GET, PATCH | قائمة الوكلاء المتاحين · تحديث حالة الوكيل |
| `/api/support/voice/twilio` | POST (webhook), PUT (initiate) | استقبال Twilio webhooks · بدء مكالمة outbound |
| `/api/support/voice/vonage` | POST (webhook), PUT (initiate) | استقبال Vonage webhooks · بدء مكالمة outbound |

---

## الصفحات الجديدة (2)

### `/support` — مركز الدعم للعميل (341 سطر)

**4 حالات عرض:**
1. **الرئيسية (Home):** إحصاءات سريعة + 3 قنوات تواصل + آخر التذاكر
2. **تذكرة جديدة (New Ticket):** نموذج مع عنوان + وصف + فئة + أولوية
3. **طلب مكالمة (Callback):** رقم الهاتف + جدولة اختيارية + ساعات الدعم
4. **تذاكري (My Tickets):** قائمة كاملة + تقييم التذاكر المحلولة

**ميزات الصفحة:**
- يُظهر عدد الوكلاء المتاحين مباشرة
- Rate limiting: 5 تذاكر/ساعة، 3 مكالمات/ساعة
- Auto-reopen للتذكرة عند رد المستخدم
- نظام تقييم ⭐ للتذاكر المحلولة

### `/admin/support` — لوحة تحكم الدعم (192 سطر)

**3 تبويبات:**

| التبويب | المحتوى |
|---------|---------|
| 🎫 التذاكر | قائمة كاملة + فلتر بالحالة + إحصاءات |
| 📞 المكالمات | سجل كامل + زر "اتصل" للمكالمات المطلوبة |
| 👤 الوكلاء | قائمة الوكلاء مع الحالة والتقييم |

**StatCards:**
- تذاكر مفتوحة
- مكالمات معلقة
- وكلاء متاحون
- إجمالي التذاكر

---

## Voice Support — كيف يعمل

### قناة 1: Twilio Voice

```
العميل → طلب مكالمة (POST /api/support/calls)
       → يُنشأ support_calls record (status=requested)
Admin  → يرى المكالمة في /admin/support
       → يضغط "اتصل" → PUT /api/support/voice/twilio
       → Twilio يتصل بالعميل (caller_phone)
       → Twilio webhook → POST /api/support/voice/twilio
       → يُحدَّث call status تلقائياً
```

**TwiML Response:** خادمنا يُرجع `<?xml?><Response></Response>` لـ Twilio

### قناة 2: Vonage Voice

```
نفس الفلسفة لكن:
- PUT /api/support/voice/vonage (initiate)
- POST /api/support/voice/vonage (webhook status updates)
- يستخدم Vonage REST API + NCCO (Nexmo Call Control Objects)
```

### اختيار المزود

| المعيار | Twilio | Vonage |
|---------|--------|--------|
| السعر/دقيقة (KSA) | ~$0.022 | ~$0.019 |
| SDK/Docs | ممتازة | جيدة |
| تسجيل المكالمات | سهل | متاح |
| رقم سعودي | متاح | متاح |
| **التوصية** | **✅ Twilio** | بديل |

---

## CRM Integration مع User Profile

كل `support_ticket` و `support_call` مرتبط بـ:
- `user_id` → profiles (الاسم، البريد، دور)
- `org_id` → organizations (المنشأة، الخطة، القطاع)

Admin يستطيع عبر `/admin/support`:
- رؤية من أرسل التذكرة
- معرفة خطته الحالية
- تتبع سجل كل التذاكر والمكالمات للمستخدم

---

## متغيرات البيئة الجديدة

```bash
# Twilio (اختر أحد المزودَين)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+966xxxxxxxxx

# Vonage (البديل)
VONAGE_API_KEY=xxxxxxxx
VONAGE_API_SECRET=xxxxxxxxxxxxxxxx
VONAGE_PHONE_NUMBER=+966xxxxxxxxx
```

**ملاحظة:** المنصة تعمل بدون هذه المتغيرات — الـ callback requests تُسجَّل لكن المكالمة لا تنطلق تلقائياً. يمكن تفعيل المزود لاحقاً.

---

## تكلفة التشغيل الشهرية المتوقعة

### Twilio (التوصية)

| البند | التكلفة | ملاحظة |
|-------|---------|--------|
| رقم هاتف سعودي | $2/شهر | رقم محلي +966 |
| مكالمات inbound | $0.0085/دقيقة | العميل يتصل |
| مكالمات outbound (KSA) | $0.022/دقيقة | نحن نتصل |
| تسجيل المكالمات | $0.0025/دقيقة | اختياري |
| **100 مكالمة × 5 دق** | **~$14/شهر** | تقدير أولي |

### Vonage (البديل)

| البند | التكلفة |
|-------|---------|
| رقم هاتف | $1.5/شهر |
| مكالمات (KSA) | $0.019/دقيقة |
| **100 مكالمة × 5 دق** | **~$11/شهر** |

### إجمالي تكلفة الدعم الشهرية

| الخدمة | التكلفة |
|--------|---------|
| Twilio (صوت) | $15-30/شهر |
| Resend (إيميلات) | $0 حتى 3K إيميل/شهر |
| وكلاء دعم (بشري) | تكلفة عمل داخلية |
| **إجمالي تشغيل** | **$15-30/شهر** |

---

## روابط الإعداد

```
Twilio:
1. twilio.com → Sign up
2. Console → Phone Numbers → Buy (+966)
3. Console → Webhooks → set to https://monshaati.ai/api/support/voice/twilio
4. Console → API Keys → copy Account SID + Auth Token

Vonage:
1. vonage.com → Dashboard
2. Numbers → Buy Saudi number
3. Voice → Applications → set webhook URL
4. API Settings → copy key + secret
```

---

## ملخص النظام

| المقياس | القيمة |
|---------|--------|
| جداول جديدة | 4 |
| API routes جديدة | 6 |
| صفحات جديدة | 2 |
| TypeScript errors | 0 ✅ |
| إجمالي الملفات | 159 |
| إجمالي API routes | 67 |
| إجمالي الصفحات | 40 |
| الـ migrations | 12 |
| مزودو Voice | Twilio + Vonage (كلاهما) |
| قنوات الدعم | Chat + Email + Voice + Callback = 4 |

---
*Monshaati AI Voice Support | TypeScript ✅ | Twilio + Vonage | 159 files*
