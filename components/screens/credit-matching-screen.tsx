'use client';

import { ArrowLeft, CreditCard, Sparkles, Check, ShieldCheck, ChevronRight, Star } from 'lucide-react';
import { useApp } from '@/lib/store';
import { demoCreditProducts } from '@/data/mock';
import { formatCurrency, formatCompact } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function CreditMatchingScreen() {
  const { navigate, selectedCreditIds, toggleSelectedCredit } = useApp();

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Sizga mos kreditlar</h1>
        <div className="w-9" />
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-primary/10 p-3.5">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-xs text-foreground">
            AI sizning ehtiyojingiz va biznesingiz asosida 3 ta variant topdi.
          </p>
        </div>

        <div className="space-y-3">
          {demoCreditProducts.map((product) => {
            const isSelected = selectedCreditIds.includes(product.id);
            return (
              <div
                key={product.id}
                className={cn(
                  'rounded-2xl border bg-card p-4 shadow-sm transition-all',
                  isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{product.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{product.bank}</p>
                    </div>
                  </div>
                  {product.badge && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {product.badge}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-accent p-2.5">
                    <div className="text-[10px] text-muted-foreground">Summa</div>
                    <div className="text-xs font-bold text-foreground">
                      {formatCompact(product.amountMin)} – {formatCompact(product.amountMax)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-accent p-2.5">
                    <div className="text-[10px] text-muted-foreground">Muddat</div>
                    <div className="text-xs font-bold text-foreground">{product.termMonths} oygacha</div>
                  </div>
                  <div className="rounded-xl bg-accent p-2.5">
                    <div className="text-[10px] text-muted-foreground">Foiz stavkasi</div>
                    <div className="text-xs font-bold text-foreground">{product.interestRate}%</div>
                  </div>
                  <div className="rounded-xl bg-accent p-2.5">
                    <div className="text-[10px] text-muted-foreground">Imtiyozli davr</div>
                    <div className="text-xs font-bold text-foreground">{product.gracePeriod} oy</div>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Garov:</span>
                    <span className="font-medium text-foreground">{product.collateral}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Maqsad:</span>
                    <span className="font-medium text-foreground text-right">{product.purpose}</span>
                  </div>
                </div>

                {/* Match Score */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="text-sm font-bold text-primary">Moslik {product.matchScore}%</span>
                  </div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${product.matchScore}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      navigate('credit-allocation');
                      toast({ title: 'Kredit tanlandi', description: `${product.name} tanlandi` });
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
                  >
                    Batafsil
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      toggleSelectedCredit(product.id);
                      toast({
                        title: isSelected ? 'Taqqoslashdan olib tashlandi' : 'Taqqoslashga qo‘shildi',
                        description: product.name,
                      });
                    }}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:bg-accent'
                    )}
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    {isSelected ? 'Qo‘shildi' : 'Taqqoslash'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedCreditIds.length >= 2 && (
          <button
            onClick={() => navigate('credit-comparison')}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light active:scale-[0.98]"
          >
            <Star className="h-4 w-4" />
            {selectedCreditIds.length} ta kreditni taqqoslash
          </button>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Ma&apos;lumotlaringiz himoyalangan
        </div>
      </div>
    </div>
  );
}
