import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale = 'ar-SA'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));
}

export const ENTITY_TYPES: Record<string, string> = {
  sole_proprietorship: 'مؤسسة فردية',
  llc:                 'شركة ذات مسؤولية محدودة',
  joint_stock:         'شركة مساهمة',
  branch:              'فرع شركة',
  ngo:                 'منظمة غير ربحية',
  government:          'جهة حكومية',
  cooperative:         'شركة تعاونية',
  partnership:         'شركة تضامن',
};

export const ORG_SIZES: Record<string, string> = {
  '1-10':   '1 – 10 موظفين',
  '11-50':  '11 – 50 موظف',
  '51-200': '51 – 200 موظف',
  '201-500':'201 – 500 موظف',
  '500+':   'أكثر من 500 موظف',
};

export const COUNTRIES: Record<string, string> = {
  SA: '🇸🇦 المملكة العربية السعودية',
  AE: '🇦🇪 الإمارات العربية المتحدة',
  QA: '🇶🇦 قطر',
  KW: '🇰🇼 الكويت',
  BH: '🇧🇭 البحرين',
  OM: '🇴🇲 عُمان',
  US: '🇺🇸 الولايات المتحدة',
  GB: '🇬🇧 المملكة المتحدة',
  DE: '🇩🇪 ألمانيا',
  FR: '🇫🇷 فرنسا',
};

export const CITIES: Record<string, string[]> = {
  SA: ['الرياض','جدة','الدمام','الخبر','مكة المكرمة','المدينة المنورة','الطائف','تبوك','أبها','بريدة','نجران','حائل','الجبيل','ينبع','الأحساء'],
  AE: ['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين','العين'],
  QA: ['الدوحة','الوكرة','الخور','الريان','أم صلال'],
  KW: ['الكويت العاصمة','السالمية','حولي','الفروانية','الجهراء','الأحمدي','مبارك الكبير'],
  BH: ['المنامة','المحرق','الرفاع','مدينة عيسى','مدينة حمد','سترة'],
  OM: ['مسقط','صلالة','صحار','نزوى','صور','البريمي'],
  US: ['New York','Los Angeles','Houston','Chicago','Dallas','San Francisco','Miami','Washington DC','Boston','Seattle','Austin','Atlanta'],
  GB: ['London','Manchester','Birmingham','Leeds','Glasgow','Edinburgh','Liverpool','Bristol','Sheffield','Cardiff'],
  DE: ['Berlin','Munich','Hamburg','Frankfurt','Cologne','Stuttgart','Düsseldorf','Dresden'],
  FR: ['Paris','Lyon','Marseille','Toulouse','Nice','Nantes','Strasbourg','Bordeaux'],
};

export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD',
  BH: 'BHD', OM: 'OMR', US: 'USD', GB: 'GBP',
  DE: 'EUR', FR: 'EUR',
};

export const SUB_PLAN_LABELS: Record<string, string> = {
  free_trial:   'تجريبي مجاني',
  starter:      'ستارتر',
  business:     'بيزنس',
  professional: 'احترافي',
};

export const WF_STATUS_LABELS: Record<string, string> = {
  draft:     'مسودة',
  review:    'قيد المراجعة',
  approved:  'معتمد',
  published: 'منشور',
  archived:  'مؤرشف',
};
