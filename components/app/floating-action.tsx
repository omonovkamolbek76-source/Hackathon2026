'use client';

import { Plus, CreditCard, FileText, Wallet, TrendingUp, CheckSquare, Bot, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { ScreenId } from '@/types';

interface ActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  screen: ScreenId;
  highlight?: boolean;
  color: string;
}

const actions: ActionItem[] = [
  { label: 'Kredit topish', icon: CreditCard, screen: 'credit-matching', highlight: true, color: 'bg-primary text-primary-foreground' },
  { label: 'AI bilan maslahatlashish', icon: Bot, screen: 'ai', color: 'bg-chart-2 text-white' },
  { label: 'Biznes reja yaratish', icon: FileText, screen: 'business-plan', color: 'bg-navy text-white' },
  { label: 'Xarajat qo‘shish', icon: Wallet, screen: 'ai', color: 'bg-chart-4 text-white' },
  { label: 'Daromad qo‘shish', icon: TrendingUp, screen: 'ai', color: 'bg-chart-1 text-white' },
  { label: 'Vazifa qo‘shish', icon: CheckSquare, screen: 'tasks', color: 'bg-chart-3 text-white' },
];

export function FloatingActionButton() {
  const { actionSheetOpen, setActionSheetOpen, navigate } = useApp();

  return (
    <>
      <button
        onClick={() => setActionSheetOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        aria-label="Tezkor amal"
      >
        <Plus className="h-7 w-7" />
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
      </button>

      {actionSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setActionSheetOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-t-3xl border border-border bg-background p-5 pb-8 animate-slide-up md:rounded-3xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Tezkor amallar</h2>
              <button
                onClick={() => setActionSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-muted-foreground"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      navigate(action.screen);
                      setActionSheetOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-accent',
                      action.highlight && 'border-2 border-primary/20 bg-primary/5'
                    )}
                  >
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', action.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">{action.label}</div>
                      {action.highlight && (
                        <div className="text-[11px] text-primary">AI sizga mos variantlarni taqqoslaydi</div>
                      )}
                    </div>
                    {action.highlight && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        ASOSIY
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
