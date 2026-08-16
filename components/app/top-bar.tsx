'use client';

import { Bell, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';

export function TopBar({ title, subtitle, showLogo }: { title?: string; subtitle?: string; showLogo?: boolean }) {
  const { navigate } = useApp();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur-lg md:px-6">
      {showLogo ? (
        <button onClick={() => navigate('home')} className="flex items-center gap-2 no-tap-highlight">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <div className="text-base font-bold leading-tight text-foreground">TadbirkorAI</div>
            <div className="text-[11px] leading-tight text-muted-foreground">Biznesingiz uchun aqlli yordamchi</div>
          </div>
        </button>
      ) : (
        <div>
          {title && <h1 className="text-lg font-bold text-foreground">{title}</h1>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <button
        onClick={() => {}}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent text-foreground transition-colors hover:bg-accent/80"
        aria-label="Bildirishnomalar"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
      </button>
    </header>
  );
}
