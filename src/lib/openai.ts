import OpenAI from 'openai';
import type { GenerationInput, GenerationResult } from '@/types/database';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------------------------------------------------
// Helpers — defined before use (avoids hoisting issues)
// ----------------------------------------------------------------
function getSizeGuidance(size: string): string {
  const guides: Record<string, string> = {
    '1-10':    '3-4 أدوار، مستويان كحد أقصى، هيكل مبسط',
    '11-50':   '6-8 أدوار، 3 مستويات، أقسام رئيسية',
    '51-200':  '10-14 دور، 4 مستويات، إدارات متخصصة',
    '201-500': '16-20 دور، 4-5 مستويات، هيكل مؤسسي متكامل',
    '500+':    '20-25 دور، 5-6 مستويات، تخصص كامل',
  };
  return guides[size] ?? '8-10 أدوار، 3-4 مستويات';
}

const ENTITY_MAP: Record<string, string> = {
  sole_proprietorship: 'مؤسسة فردية',
  llc:                 'شركة ذات مسؤولية محدودة',
  joint_stock:         'شركة مساهمة',
  branch:              'فرع شركة',
  ngo:                 'منظمة غير ربحية',
  government:          'جهة حكومية',
  cooperative:         'شركة تعاونية',
  partnership:         'شركة تضامن',
};

const SIZE_MAP: Record<string, string> = {
  '1-10':    'ناشئة صغيرة (1-10 موظفين)',
  '11-50':   'شركة صغيرة (11-50 موظف)',
  '51-200':  'شركة متوسطة (51-200 موظف)',
  '201-500': 'شركة كبيرة (201-500 موظف)',
  '500+':    'مؤسسة كبرى (أكثر من 500 موظف)',
};

const CURRENCY_MAP: Record<string, string> = {
  SA: 'SAR', AE: 'AED', US: 'USD', GB: 'GBP',
  QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  DE: 'EUR', FR: 'EUR',
};

// ----------------------------------------------------------------
// Prompt builder
// ----------------------------------------------------------------
export function buildPrompt(input: GenerationInput): string {
  const currency = CURRENCY_MAP[input.country] ?? 'SAR';
  return `أنت خبير حوكمة مؤسسية وتصميم تنظيمي. أنشئ نظام تشغيل مؤسسي متكامل.

**المنشأة:**
- الاسم: ${input.org_name}
- النوع: ${ENTITY_MAP[input.entity_type] ?? input.entity_type}
- النشاط الرئيسي: ${input.primary_activity}
${input.secondary_activity ? `- التخصص: ${input.secondary_activity}` : ''}
- الحجم: ${SIZE_MAP[input.employee_count] ?? input.employee_count}
- الدولة: ${input.country} | المدينة: ${input.city}
- العملة: ${currency}

**أعد JSON فقط بهذا الهيكل الدقيق (JSON صحيح، بدون markdown):**

{
  "org_chart": [
    {
      "temp_id": "n1",
      "parent_temp_id": null,
      "title_ar": "الرئيس التنفيذي",
      "title_en": "CEO",
      "department_ar": "الإدارة العليا",
      "level": 0,
      "position_order": 0,
      "head_count": 1,
      "is_key_role": true
    }
  ],
  "job_descriptions": [
    {
      "title_ar": "الرئيس التنفيذي",
      "title_en": "CEO",
      "department_ar": "الإدارة العليا",
      "reports_to_ar": "مجلس الإدارة",
      "summary_ar": "وصف موجز للمنصب...",
      "responsibilities": ["مسؤولية 1", "مسؤولية 2"],
      "requirements": ["متطلب 1", "متطلب 2"],
      "competencies": ["كفاءة 1", "كفاءة 2"],
      "authorities": ["صلاحية 1", "صلاحية 2"],
      "salary_min": 25000,
      "salary_max": 45000,
      "currency": "${currency}",
      "experience_years": "10+ سنوات",
      "education_level": "بكالوريوس إدارة أعمال أو ما يعادله"
    }
  ],
  "policies": [
    {
      "category": "الموارد البشرية",
      "title_ar": "سياسة الحضور والانصراف",
      "title_en": "Attendance Policy",
      "content_ar": "نص السياسة التفصيلي الكامل..."
    }
  ],
  "kpis": [
    {
      "department_ar": "الإدارة",
      "name_ar": "نسبة تحقيق الأهداف الاستراتيجية",
      "name_en": "Strategic Goal Achievement Rate",
      "description_ar": "قياس نسبة تحقيق الأهداف السنوية",
      "category": "الأداء الاستراتيجي",
      "target_value": 90,
      "unit": "%",
      "frequency": "quarterly",
      "direction": "increase"
    }
  ],
  "hiring_plan": [
    {
      "phase": "المرحلة الأولى",
      "phase_order": 1,
      "role_ar": "مدير المبيعات",
      "role_en": "Sales Manager",
      "department_ar": "المبيعات",
      "priority": "high",
      "timeline": "الشهر 1-2",
      "timeline_months": 2,
      "salary_min": 12000,
      "salary_max": 18000,
      "currency": "${currency}",
      "requirements": ["خبرة 5 سنوات في المبيعات", "شهادة جامعية"]
    }
  ]
}

**قواعد الإنشاء الإلزامية:**
- الهيكل التنظيمي: ${getSizeGuidance(input.employee_count)}
- أنشئ وصف وظيفي مفصل لكل دور في الهيكل
- السياسات: على الأقل 6 سياسات (موارد بشرية، مالية، تشغيلية، أمن معلومات، جودة، سلوك مهني)
- KPIs: 12-15 مؤشر موزعة على جميع الأقسام
- خطة التوظيف: 3 مراحل بأولويات واضحة
- الرواتب بعملة ${currency} تتناسب مع سوق ${input.country}
- جميع المحتوى مخصص لقطاع: ${input.primary_activity}`;
}

// ----------------------------------------------------------------
// Return type using correct OpenAI namespace
// ----------------------------------------------------------------
type UsageResult = OpenAI.Chat.Completions.ChatCompletion['usage'];

export async function generateOrgSystem(input: GenerationInput): Promise<{
  result: GenerationResult;
  usage: UsageResult;
  timeMs: number;
}> {
  const prompt = buildPrompt(input);
  const start = Date.now();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'أنت خبير حوكمة مؤسسية. أعد JSON فقط بدون markdown أو نص إضافي. يجب أن يكون JSON صالحاً تماماً.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const timeMs = Date.now() - start;
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Empty response from OpenAI');

  let result: GenerationResult;
  try {
    result = JSON.parse(raw) as GenerationResult;
  } catch {
    throw new Error('Invalid JSON response from OpenAI');
  }

  if (!result.org_chart || !Array.isArray(result.org_chart)) {
    throw new Error('Missing org_chart in AI response');
  }

  return { result, usage: completion.usage, timeMs };
}
