'use client';
import { useState } from 'react';
import type { AIRecommendation } from '@/types/database';

const IMPACT_COLORS: Record<string, string> = {
  low:      'bg-gray-100 text-gray-700',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

interface WhyRecommendationProps {
  recommendation: AIRecommendation;
  onDismiss?: (id: string) => void;
}

export default function WhyRecommendation({ recommendation: rec, onDismiss }: WhyRecommendationProps) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${IMPACT_COLORS[rec.impact_label] ?? IMPACT_COLORS.medium}`}>
              {rec.impact_label === 'high' ? '🔥 تأثير عالٍ' : rec.impact_label === 'critical' ? '⚡ حرج' : rec.impact_label === 'low' ? 'تأثير منخفض' : 'تأثير متوسط'}
            </span>
            <span className="text-xs text-gray-400">
              {rec.effort_label === 'low' ? '✅ سهل التنفيذ' : rec.effort_label === 'high' ? '⚙️ يتطلب جهد' : 'متوسط الجهد'}
            </span>
          </div>
          <h3 className="font-bold text-gray-900">{rec.title_ar}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowWhy(p => !p)}
            className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors font-medium"
          >
            {showWhy ? '▼' : '▶'} لماذا؟
          </button>
          {onDismiss && (
            <button onClick={() => onDismiss(rec.id)} className="text-gray-300 hover:text-gray-500 text-lg">✕</button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{rec.body_ar}</p>

      {showWhy && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
            <div className="flex items-start gap-2">
              <span className="text-xl flex-shrink-0">💡</span>
              <div>
                <div className="font-semibold text-amber-900 text-sm mb-1">لماذا نوصي بهذا؟</div>
                <p className="text-amber-800 text-sm">{rec.reason_ar}</p>
              </div>
            </div>
            {rec.evidence.length > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <div className="text-xs font-semibold text-amber-700 mb-1">الأدلة:</div>
                {rec.evidence.map((e, i) => (
                  <div key={i} className="text-xs text-amber-700">• {(e as Record<string,unknown>).data_point as string}</div>
                ))}
              </div>
            )}
          </div>

          {rec.action_steps.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">خطوات التنفيذ:</div>
              {rec.action_steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span className="w-5 h-5 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span>
                  <span className="text-sm text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
