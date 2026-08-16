'use client';

import { useState } from 'react';
import { ArrowLeft, Wallet, Wrench, Package, Megaphone, Shield, Plus, Minus, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/store';
import { demoFundAllocations } from '@/data/mock';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import type { FundAllocation } from '@/types';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench,
  Package,
  Megaphone,
  Wallet,
  Shield,
};

export function CreditAllocationScreen() {
  const { navigate } = useApp();
  const [allocations, setAllocations] = useState<FundAllocation[]>(demoFundAllocations);

  const total = allocations.reduce((sum, a) => sum + a.amount, 0);

  const adjustAmount = (index: number, delta: number) => {
    setAllocations((prev) =>
      prev.map((a, i) => (i === index ? { ...a, amount: Math.max(0, a.amount + delta) } : a))
    );
  };

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('credit-matching')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Kreditni rejalashtirish</h1>
        <div className="w-9" />
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary/5 to-accent p-4">
          <h2 className="text-sm font-bold text-foreground">Kredit mablag‘ini qanday ishlatasiz?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Summalarni o‘zgartirib, mablag‘ni to‘g‘ri taqsimlang.
          </p>
        </div>

        {/* Visual progress bar */}
        <div className="mb-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-accent">
            {allocations.map((a, i) => (
              <div
                key={i}
                className="transition-all"
                style={{
                  width: `${(a.amount / total) * 100}%`,
                  backgroundColor: a.color,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Jami:</span>
            <span className="text-sm font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Allocation items */}
        <div className="space-y-2">
          {allocations.map((alloc, i) => {
            const Icon = iconMap[alloc.icon] || Wallet;
            const percentage = total > 0 ? Math.round((alloc.amount / total) * 100) : 0;
            return (
              <div key={alloc.category} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: alloc.color + '20', color: alloc.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{alloc.label}</div>
                    <div className="text-[11px] text-muted-foreground">{percentage}% · {formatCurrency(alloc.amount)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => adjustAmount(i, -1000000)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-foreground transition-colors hover:bg-accent/80 active:scale-90"
                      aria-label="Kamaytirish"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => adjustAmount(i, 1000000)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 active:scale-90"
                      aria-label="Ko‘paytirish"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent">
                  <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: alloc.color }} />
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            toast({ title: 'Reja saqlandi', description: 'Kredit mablag‘i taqsimoti saqlandi' });
            navigate('credit-roadmap');
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          Rejani tasdiqlash
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Ma&apos;lumotlaringiz himoyalangan
        </div>
      </div>
    </div>
  );
}
