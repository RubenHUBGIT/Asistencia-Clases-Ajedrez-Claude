import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      {children}
    </div>
  );
}
