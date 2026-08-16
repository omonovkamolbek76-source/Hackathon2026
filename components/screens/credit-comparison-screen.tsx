'use client';

import { ArrowLeft, Star, Check, X, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import { demoCreditProducts } from '@/data/mock';
import { formatCompact } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CreditComparisonScreen() {
  const { navigate, selectedCreditIds } = useApp();
  const products = demoCreditProducts.filter((p) => selectedCreditIds.includes(p.id));

  if (products.length < 2) {
    return (
      <div className="animate-fade-in">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
          <button onClick={() => navigate('credit-matching')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">Taqqoslash</h1>
          <div className="w-9" />
        </header>
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <Star className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">Taqqoslash uchun kamida 2 ta kredit tanlang</p>
          <button onClick={() => navigate('credit-matching')} className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">
            Kreditlarga qaytish
          </button>
        </div>
      </div>
    );
  }

  const rows = [
    { label: 'Kredit maqsadi', getValue: (p: typeof products[0]) => p.purpose },
    { label: 'Summa', getValue: (p: typeof products[0]) => `${formatCompact(p.amountMin)} – ${formatCompact(p.amountMax)}` },
    { label: 'Muddat', getValue: (p: typeof products[0]) => `${p.termMonths} oy` },
    { label: 'Foiz stavkasi', getValue: (p: typeof products[0]) => `${p.interestRate}%` },
    { label: 'Imtiyozli davr', getValue: (p: typeof products[0]) => `${p.gracePeriod} oy` },
    { label: 'Garov', getValue: (p: typeof products[0]) => p.collateral },
    { label: 'Moslik', getValue: (p: typeof products[0]) => `${p.matchScore}%` },
  ];

  const bestProduct = [...products].sort((a, b) => b.matchScore - a.matchScore)[0];

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('credit-matching')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Kredit taqqoslash</h1>
        <div className="w-9" />
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="min-w-full">
            {/* Product headers */}
            <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `100px repeat(${products.length}, 1fr)` }}>
              <div />
              {products.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'rounded-2xl border p-3',
                    p.id === bestProduct.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  {p.id === bestProduct.id && (
                    <span className="mb-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                      TAVSIYA
                    </span>
                  )}
                  <div className="text-xs font-bold text-foreground">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.bank}</div>
                </div>
              ))}
            </div>

            {/* Comparison rows */}
            <div className="space-y-1">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-2 rounded-xl py-1"
                  style={{ gridTemplateColumns: `100px repeat(${products.length}, 1fr)` }}
                >
                  <div className="flex items-center text-[11px] font-medium text-muted-foreground">{row.label}</div>
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center rounded-xl p-2 text-[11px] font-medium',
                        p.id === bestProduct.id ? 'bg-primary/5 text-primary' : 'bg-card text-foreground'
                      )}
                    >
                      {row.getValue(p)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommended reasons */}
        <h3 className="mb-2 mt-5 text-sm font-bold text-foreground">Nima uchun tavsiya qilindi?</h3>
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                {p.id === bestProduct.id ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-muted-foreground">
                    <Star className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="text-xs font-bold text-foreground">{p.name}</div>
                <span className="ml-auto text-xs font-bold text-primary">Moslik {p.matchScore}%</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{p.recommendedReason}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('credit-allocation')}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" />
          Eng yaxshi variantni tanlash
        </button>
      </div>
    </div>
  );
}
