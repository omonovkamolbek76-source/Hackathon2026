'use client';

import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  theme: 'green' | 'navy' | 'light-green';
}

const themes = {
  green: 'bg-primary text-primary-foreground',
  navy: 'bg-navy text-white',
  'light-green': 'bg-primary/10 text-primary',
};

export function QuickActionCard({ icon: Icon, title, description, onClick, theme }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 min-w-[100px] flex-col items-start rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', themes[theme])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-2.5 text-sm font-bold text-foreground">{title}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{description}</div>
      <div className="mt-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-foreground">
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}
