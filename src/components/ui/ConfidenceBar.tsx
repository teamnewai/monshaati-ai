'use client';
import { cn } from '@/lib/utils';

interface ConfidenceBarProps {
  confidence:  number;   // 0-100
  riskLevel?:  string;
  impactLevel?: string;
  className?:  string;
  compact?:    boolean;
}

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: 'مخاطر منخفضة',   color: 'text-green-700',  bg: 'bg-green-100' },
  medium:   { label: 'مخاطر متوسطة',   color: 'text-amber-700',  bg: 'bg-amber-100' },
  high:     { label: 'مخاطر عالية',     color: 'text-orange-700', bg: 'bg-orange-100' },
  critical: { label: 'مخاطر حرجة',     color: 'text-red-700',    bg: 'bg-red-100' },
};

const IMPACT_CONFIG: Record<string, { label: string; color: string }> = {
  low:      { label: 'تأثير منخفض',   color: 'text-gray-600' },
  medium:   { label: 'تأثير متوسط',   color: 'text-blue-600' },
  high:     { label: 'تأثير عالٍ',    color: 'text-purple-600' },
  critical: { label: 'تأثير حاسم',    color: 'text-red-600' },
};

export default function ConfidenceBar({
  confidence, riskLevel = 'medium', impactLevel = 'medium', className, compact = false,
}: ConfidenceBarProps) {
  const risk   = RISK_CONFIG[riskLevel]   ?? RISK_CONFIG.medium;
  const impact = IMPACT_CONFIG[impactLevel] ?? IMPACT_CONFIG.medium;

  const barColor =
    confidence >= 80 ? 'bg-green-500' :
    confidence >= 60 ? 'bg-blue-500' :
    confidence >= 40 ? 'bg-amber-500' : 'bg-red-500';

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${confidence}%` }} />
        </div>
        <span className="text-xs text-gray-500">{confidence}% ثقة</span>
      </div>
    );
  }

  return (
    <div className={cn('bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">مستوى الثقة</span>
        <span className="font-bold text-gray-900">{confidence}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${confidence}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', risk.bg, risk.color)}>
          {risk.label}
        </span>
        <span className={cn('text-xs font-medium', impact.color)}>
          {impact.label}
        </span>
      </div>
    </div>
  );
}
