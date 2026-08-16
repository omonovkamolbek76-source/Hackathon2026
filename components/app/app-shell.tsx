'use client';

import { useApp } from '@/lib/store';
import { BottomNav } from '@/components/app/bottom-nav';
import { Sidebar } from '@/components/app/sidebar';
import { FloatingActionButton } from '@/components/app/floating-action';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { screen } = useApp();
  const isChatScreen = screen === 'ai';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={cn('md:pl-64', isChatScreen ? 'pb-16 md:pb-0' : 'pb-20 md:pb-0')}>
        <div className="mx-auto min-h-screen max-w-md md:max-w-2xl lg:max-w-3xl">
          {children}
        </div>
      </main>
      <BottomNav />
      <FloatingActionButton />
    </div>
  );
}
