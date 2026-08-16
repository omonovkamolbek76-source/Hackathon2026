'use client';

import { Home, BarChart3, Bot, FileText, User } from 'lucide-react';
import { useApp } from '@/lib/store';
import type { ScreenId } from '@/types';
import { cn } from '@/lib/utils';

const navItems: { id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Bosh sahifa', icon: Home },
  { id: 'analytics', label: 'Tahlil', icon: BarChart3 },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'business-plan', label: 'Biznes reja', icon: FileText },
  { id: 'profile', label: 'Profil', icon: User },
];

export function BottomNav() {
  const { screen, navigate } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = screen === item.id;
          if (item.id === 'ai') {
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className="flex flex-col items-center gap-1 px-2 no-tap-highlight"
                aria-label={item.label}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </button>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className="flex flex-col items-center gap-1 px-2 py-1 no-tap-highlight"
              aria-label={item.label}
            >
              <div className={cn('flex h-8 w-8 items-center justify-center transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                {item.label}
              </span>
              {isActive && <div className="h-1 w-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
