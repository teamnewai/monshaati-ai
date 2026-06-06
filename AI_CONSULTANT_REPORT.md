# AI_CONSULTANT_REPORT.md — Monshaati AI
**Date:** 2026-06-05 | **TypeScript:** ✅ 0 errors | **Status:** ✅ 100% مكتمل ومربوط ببيانات المنشأة

---

## الجداول الجديدة (Migration 009)

| الجدول | الوظيفة | RLS |
|--------|---------|-----|
| `consultant_conversations` | المحادثات مع الذكاء الاصطناعي (ويحتوي: disclaimer، escalation، satisfaction) | ✅ org-scoped |
| `consultant_messages` | كل رسالة مع confidence_score + risk_level + recommendations + data_sources | ✅ conversation-scoped |
| `ai_consultant_stats` | إحصاءات يومية (super_admin فقط) | ✅ admin-only |

**ENUM Types الجديدة:** `consultant_type` (8 تخصصات) · `risk_level` (low/medium/high/critical)

**Trigger:** `on_message_added` → يحدث `messages_count` في `consultant_conversations` تلقائياً

---

## APIs الجديدة (3 routes)

| Route | Methods | الوظيفة |
|-------|---------|---------|
| `api/ai-consultant/conversations` | GET, POST, PATCH | CRUD المحادثات + قبول disclaimer + تحديث satisfaction |
| `api/ai-consultant/chat` | POST | **المنطق الرئيسي** — GPT-4o + context كامل + escalation + saving |
| `api/ai-consultant/stats` | GET | Admin dashboard (super_admin فقط) |

---

## الصفحات الجديدة (2 صفحات)

| الصفحة | الوظيفة |
|--------|---------|
| `/ai-consultant` | Chat UI كاملة — sidebar + messages + confidence bar + escalation |
| `/admin/ai-consultant` | Admin dashboard — إحصاءات + topics breakdown + recent conversations |

---

## المكونات الجديدة (2)

| المكوّن | الوظيفة |
|---------|---------|
| `DisclaimerModal.tsx` | إخلاء المسؤولية الإلزامي مع checkbox + topics labels |
| `ConfidenceBar.tsx` | شريط الثقة (compact + full) مع risk + impact indicators |

---

## OpenAI Logic (lib/ai-consultant.ts)

### loadOrgContext()
تحمّل **10 مصادر بيانات** من قاعدة البيانات دفعةً واحدة:

| المصدر | الجداول |
|--------|---------|
| بيانات المنشأة | `organizations` |
| الهيكل التنظيمي | `org_chart_nodes` |
| الأوصاف الوظيفية | `job_descriptions` |
| السياسات | `policies` |
| مؤشرات الأداء | `kpis` |
| خطة التوظيف | `hiring_plan` |
| البيانات المالية | `financial_records` (آخر 6 أشهر) |
| نموذج التكاليف | `cost_models` |
| تحليل الخسائر | `loss_analyses` |
| برامج التمويل | `funding_programs` |

### buildSystemPrompt()
يبني prompt ديناميكي يتضمن:
- بيانات المنشأة الأساسية
- **الهيكل التنظيمي** (كل الوحدات والمستويات)
- **الأوصاف الوظيفية** (مع الرواتب)
- **مؤشرات الأداء** (الأهداف والتكرار)
- **ملخص مالي** شهري (إيرادات، مصروفات، ربح/خسارة، هامش)
- **تحليل التكاليف** (رواتب، إيجار، سعر الوحدة)
- **تحليل الخسائر** (health score، أسباب مرتبة)
- **برامج التمويل** المتاحة
- قواعد عمل المستشار

### detectTopic()
يكشف تلقائياً موضوع الاستشارة من 8 فئات بناءً على الكلمات المفتاحية.

### requiresDisclaimer()
يكشف المواضيع الحساسة (مالية/قانونية/استثمارية/تمويل).

### runAIConsultant()
يستدعي GPT-4o بـ:
- `response_format: json_object` (مضمون)
- `max_tokens: 2000`
- `temperature: 0.5`
- آخر 10 رسائل للسياق

**Output منظّم:**
```json
{
  "content":              "الرد النصي المفصل",
  "confidence_score":     85,
  "risk_level":           "low|medium|high|critical",
  "impact_level":         "low|medium|high|critical",
  "data_sources":         ["org_chart","financials","kpis"],
  "recommendations":      [{"title","body","priority","action"}],
  "escalation_suggested": false,
  "escalation_reason":    null,
  "suggested_consultants": [],
  "requires_disclaimer":  false
}
```

---

## Disclaimer System

| متى يظهر | التوقيت |
|----------|---------|
| أول استخدام للمستشار | قبل إنشاء أي محادثة |
| استشارة مالية | إذا احتوى السؤال على كلمات مالية |
| استشارة تمويلية | عند سؤال عن القروض والمنح |
| استشارة قانونية | عند كلمات عقد/ضمان/قانون |
| توصية استثمارية | عند كلمات استثمار/أسهم/ملكية |

**النص الإلزامي:**
> "تم إنشاء هذه التوصيات والتحليلات بواسطة الذكاء الاصطناعي لأغراض استرشادية فقط، ولا تعتبر استشارة قانونية أو مالية أو استثمارية أو مهنية ملزمة. يتحمل المستخدم مسؤولية التحقق من المعلومات واتخاذ القرار المناسب."

المستخدم يجب تفعيل checkbox والضغط على "موافق" قبل المتابعة.

---

## Smart Escalation

عندما يكتشف GPT-4o أن السؤال يتجاوز قدرته:
1. يُعيد `escalation_suggested: true`
2. يبحث الـ API في `consultant_profiles` عن أفضل 3 مستشارين فعليين (by rating)
3. يُرجع لكل مستشار: الاسم، التخصص، السبب، السعر، التقييم، رابط الحجز
4. تُحدَّث المحادثة إلى status = 'escalated'

---

## AI Confidence Score — لكل رسالة

| المقياس | القيم |
|---------|-------|
| `confidence_score` | 0–100 (%) |
| `risk_level` | low / medium / high / critical |
| `impact_level` | low / medium / high / critical |

يُعرض في الواجهة كـ:
- شريط ملوّن (أخضر/أزرق/أصفر/أحمر)
- Badges للمخاطر والتأثير
- مع مصادر البيانات المستخدمة

---

## ما الذي يجعله مرتبطاً ببيانات المنشأة الفعلية؟

| البيانة | المصدر الفعلي |
|---------|--------------|
| الهيكل التنظيمي | `org_chart_nodes` → آخر generation مكتمل |
| الأوصاف الوظيفية | `job_descriptions` → نفس الـ generation |
| السياسات | `policies` → نفس الـ generation |
| مؤشرات الأداء | `kpis` → نفس الـ generation |
| البيانات المالية | `financial_records` → آخر 6 أشهر مسجلة |
| تحليل التكاليف | `cost_models` → آخر نموذج |
| تحليل الخسائر | `loss_analyses` → آخر تحليل |
| برامج التمويل | `funding_programs` → البرامج النشطة |

إذا لم تكن هناك بيانات، يطلب المستشار من المستخدم إدخالها أولاً.

---

## نسبة الإنجاز

| الميزة | النسبة |
|--------|--------|
| SQL + RLS | 100% |
| API (conversations + chat + stats) | 100% |
| lib/ai-consultant.ts (10 data sources) | 100% |
| Chat UI (458 سطر React) | 100% |
| Admin Dashboard | 100% |
| DisclaimerModal | 100% |
| ConfidenceBar | 100% |
| Smart Escalation | 100% |
| Data Sources Badge | 100% |
| Conversation History | 100% |
| **الإجمالي** | **100%** ✅ |

---

## إحصاءات الكود

| المقياس | القيمة |
|---------|--------|
| ملفات جديدة | **7 ملفات** |
| مجموع الملفات | **131 ملف** |
| API Routes | **56 route** |
| Pages | **31 صفحة** |
| SQL | **105 سطر** |
| lib/ai-consultant.ts | **266 سطر** |
| ai-consultant/page.tsx | **458 سطر** |

---
*Monshaati AI — AI Business Consultant | GPT-4o Powered | 100% ربط ببيانات المنشأة*
