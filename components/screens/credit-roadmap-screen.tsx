'use client';

import { ArrowLeft, CreditCard, Wallet, Package, ShoppingCart, BarChart3, Calendar, TrendingUp, Rocket, Check, ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { demoRoadmap } from '@/data/mock';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Wallet,
  Package,
  ShoppingCart,
  BarChart3,
  Calendar,
  TrendingUp,
  Rocket,
};

export function CreditRoadmapScreen() {
  const { navigate } = useApp();

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('credit-allocation')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Biznes yo‘l xaritasi</h1>
        <div className="w-9" />
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        {/* Flow header */}
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary to-brand-600 p-4 text-primary-foreground shadow-lg shadow-primary/20">
          <h2 className="text-lg font-bold">Kredit → Reja → Biznes → Natija</h2>
          <p className="mt-1 text-xs text-primary-foreground/80">
            TadbirkorAI sizga kredit topishdan tortib, biznes natijasigacha hamroh bo‘ladi.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {demoRoadmap.map((step, i) => {
              const Icon = iconMap[step.icon] || CreditCard;
              const isLast = i === demoRoadmap.length - 1;
              return (
                <div key={step.id} className="relative flex gap-4 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div
                    className={cn(
                      'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      isLast
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-primary/30 bg-card text-primary'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {step.id}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion card */}
        <div className="mt-5 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Tabriklaymiz!</h3>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Siz kredit olishdan tortib biznes natijasigacha to‘liq reja tuzdingiz. Endi amalga oshirish vaqti!
          </p>
        </div>

        <button
          onClick={() => navigate('home')}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          Bosh sahifaga qaytish
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
