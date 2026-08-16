'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, Sparkles, Check, ShieldCheck, ChevronRight, Star } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatCompact } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { api } from '@/lib/client-api';
import type { CreditProduct } from '@/types';

export function CreditMatchingScreen() {
  const {
    navigate,
    selectedCreditIds,
    toggleSelectedCredit,
    matchedCredits,
    creditFlowAnswers,
    runCreditMatch,
  } = useApp();
  const [products, setProducts] = useState<CreditProduct[]>(matchedCredits);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (matchedCredits.length > 0) {
        setProducts(matchedCredits);
        return;
      }
      setLoading(true);
      try {
        if (Object.keys(creditFlowAnswers).length > 0) {
          const matched = await runCreditMatch();
          if (!cancelled) setProducts(matched);
        } else {
          const data = await api<{ products: CreditProduct[] }>('/api/credits');
          if (!cancelled) setProducts(data.products);
        }
      } catch (e) {
        toast({ title: 'Xato', description: e instanceof Error ? e.message : 'Yuklashda xato' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchedCredits, creditFlowAnswers, runCreditMatch]);

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
            Moslik ballari server algoritmi bilan hisoblanadi. Bu bank qarori emas — rasmiy manbada tasdiqlang.
          </p>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>}

        <div className="space-y-3">
          {products.map((product) => {
            const isSelected = selectedCreditIds.includes(product.id);
            return (
              <div
                key={product.id}
                className={cn(
                  'rounded-2xl border bg-card p-4 shadow-sm transition-all',
                  isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border',
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
                    <div className="text-xs font-bold">
                      {formatCompact(product.amountMin)} – {formatCompact(product.amountMax)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-accent p-2.5">
                    <div className="text-[10px] text-muted-foreground">Muddat</div>
                    <div className="text-xs font-bold">{product.termMonths} oy</div>
                  </div>
                  <div className="rounded-xl bg-accent p-2.5">
                    <div className="text-[10px] text-muted-foreground">Foiz (namuna)</div>
                    <div className="text-xs font-bold">{product.interestRate}%</div>
                  </div>
                  <div className="rounded-xl bg-accent p-2.5">
                    <div className="text-[10px] text-muted-foreground">Imtiyozli davr</div>
                    <div className="text-xs font-bold">{product.gracePeriod} oy</div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs font-bold text-primary">
                    <Star className="h-3.5 w-3.5 fill-primary" />
                    Moslik: {product.matchScore || '—'}
                  </div>
                  <button
                    onClick={() => toggleSelectedCredit(product.id)}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground',
                    )}
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    {isSelected ? 'Tanlangan' : 'Tanlash'}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{product.recommendedReason}</p>
              </div>
            );
          })}
        </div>

        {!loading && products.length === 0 && (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            Avval AI orqali kredit anketasini to‘ldiring yoki katalogni qayta yuklang.
          </div>
        )}

        <button
          disabled={selectedCreditIds.length === 0}
          onClick={() => navigate('credit-comparison')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Taqqoslash
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-primary" />
          Stavkalar namuna — oilakredit.uz / bankda tasdiqlang
        </div>
      </div>
    </div>
  );
}
