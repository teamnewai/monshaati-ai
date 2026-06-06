import type React from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import PWAInstallBanner from '@/components/ui/PWAInstallBanner';

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
