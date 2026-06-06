'use client';
import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

const DISCLAIMER_TEXT = 'تم إنشاء هذه التوصيات والتحليلات بواسطة الذكاء الاصطناعي لأغراض استرشادية فقط، ولا تعتبر استشارة قانونية أو مالية أو استثمارية أو مهنية ملزمة. يتحمل المستخدم مسؤولية التحقق من المعلومات واتخاذ القرار المناسب.';

interface DisclaimerModalProps {
  open:     boolean;
  onAccept: () => void;
  onClose:  () => void;
  topics?:  string[];
}

const TOPIC_LABELS: Record<string, string> = {
  financial:      'استشارة مالية',
  funding:        'استشارة تمويلية',
  legal:          'استشارة قانونية',
  investment:     'توصية استثمارية',
  administrative: 'استشارة إدارية',
  strategic:      'استشارة استراتيجية',
};

export default function DisclaimerModal({ open, onAccept, onClose, topics = [] }: DisclaimerModalProps) {
  const [checked, setChecked] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title="إخلاء المسؤولية ⚠️">
      <div className="space-y-5">
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topics.map(t => (
              <span key={t} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                {TOPIC_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        )}

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <p className="text-sm text-amber-900 leading-relaxed font-medium">{DISCLAIMER_TEXT}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
          <p className="font-semibold text-gray-700">يُنصح بـ:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>مراجعة مختص معتمد قبل اتخاذ أي قرار مالي أو قانوني</li>
            <li>التحقق من المعلومات من مصادر رسمية</li>
            <li>استشارة محاسب أو مستشار قانوني عند الحاجة</li>
          </ul>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e: { target: { checked: boolean } }) => setChecked(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-brand-500 flex-shrink-0 cursor-pointer"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            أقر بأنني قرأت وفهمت إخلاء المسؤولية، وأوافق على الاستمرار مع العلم بأن هذه الاستشارة لأغراض إرشادية فقط.
          </span>
        </label>

        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={!checked}
            onClick={() => { if (checked) onAccept(); }}
          >
            موافق — ابدأ الاستشارة
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </div>
    </Modal>
  );
}
