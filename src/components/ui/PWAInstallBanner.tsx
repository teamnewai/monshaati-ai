'use client';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallBanner() {
  const [prompt,   setPrompt]   = useState<BeforeInstallPromptEvent | null>(null);
  const [visible,  setVisible]  = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    // Check if dismissed before
    if (localStorage.getItem('pwa-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-dismissed', '1');
    setVisible(false);
  };

  if (!visible || installed) return null;

  return (
    <div className="pwa-install-banner p-4 flex items-center gap-3 md:hidden">
      <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">م</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900 text-sm">ثبّت منشأتي AI</div>
        <div className="text-xs text-gray-500">أضف إلى الشاشة الرئيسية للوصول السريع</div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={handleDismiss}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">لاحقاً</button>
        <button onClick={handleInstall}
          className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg font-bold">
          تثبيت
        </button>
      </div>
    </div>
  );
}
