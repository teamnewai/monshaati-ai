'use client';
import { useState } from 'react';
import type { HelpDefinition } from '@/types/database';

interface HelpTooltipProps {
  fieldKey:   string;
  helpData:   Record<string, HelpDefinition>;
  className?: string;
}

export default function HelpTooltip({ fieldKey, helpData, className }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const help = helpData[fieldKey];
  if (!help) return null;

  return (
    <div className={`relative inline-flex ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 hover:bg-brand-100 hover:text-brand-700 text-xs flex items-center justify-center transition-colors"
        title={help.label_ar}
      >
        ℹ
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 bottom-7 right-0 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4 text-right">
            <h4 className="font-bold text-gray-900 text-sm mb-2">{help.label_ar}</h4>
            <p className="text-gray-600 text-xs leading-relaxed mb-2">{help.tooltip_ar}</p>
            {help.example_ar && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-xs text-blue-800">
                <span className="font-semibold">مثال: </span>{help.example_ar}
              </div>
            )}
            {help.formula_ar && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs text-gray-700 mt-1 font-mono">
                📐 {help.formula_ar}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
