'use client';

import { Home, BarChart3, Bot, FileText, User, Sparkles, CreditCard } from 'lucide-react';
import { useApp } from '@/lib/store';
import type { ScreenId } from '@/types';
import { cn } from '@/lib/utils';

const navItems: { id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Bosh sahifa', icon: Home },
  { id: 'ai', label: 'AI maslahatchi', icon: Bot },
  { id: 'business-plan', label: 'Biznes reja', icon: FileText },
  { id: 'analytics', label: 'Tahlil', icon: BarChart3 },
  { id: 'tasks', label: 'Vazifalar', icon: Sparkles },
];

const bottomNavItems: { id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'subscription', label: 'Obuna', icon: CreditCard },
  { id: 'profile', label: 'Profil', icon: User },
];

export function Sidebar() {
  const { screen, navigate } = useApp();

  return (
    <aside className="hidden md:flex md:fixed md:left-0 md:top-0 md:bottom-0 md:w-64 md:flex-col md:border-r md:border-border md:bg-card">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">TadbirkorAI</div>
          <div className="text-[11px] text-muted-foreground">Biznes yordamchisi</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
        <div className="my-2 border-t border-border" />
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-xl bg-accent p-3">
          <div className="text-xs font-semibold text-foreground">Ishchi rejim</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Auth + DB saqlash yoqilgan. Kredit stavkalari rasmiy manbada tasdiqlansin.
          </div>
        </div>
      </div>
    </aside>
  );
}
