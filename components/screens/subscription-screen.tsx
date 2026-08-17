'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/store';
import { api } from '@/lib/client-api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type PlanKey = 'FREE' | 'BUSINESS' | 'BUSINESS_PRO' | 'FINANCIAL' | 'FINANCIAL_PRO';

type Plan = {
  key: PlanKey;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  features: string[];
  aiMessagesPerDay: number;
  voiceMinutesPerDay: number;
  financialAnalysis: boolean;
  prioritySupport: boolean;
};

type SubscriptionStatus = {
  subscription: { status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean; planKey: string } | null;
  plan: Plan | null;
  usage: { messagesToday: number };
};

function formatPrice(priceCents: number, currency: string, interval: string) {
  if (priceCents === 0) return 'Bepul';
  const amount = (priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2);
  return `$${amount} / ${interval === 'month' ? 'oy' : interval}${currency !== 'USD' ? ` (${currency})` : ''}`;
}

export function SubscriptionScreen() {
  const { navigate } = useApp();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState<PlanKey | null>(null);

  useEffect(() => {
    Promise.all([
      api<SubscriptionStatus>('/api/subscription'),
      api<{ plans: Plan[] }>('/api/subscription/plans'),
    ])
      .then(([sub, planList]) => {
        setStatus(sub);
        setPlans(planList.plans);
      })
      .catch(() => toast({ title: 'Xato', description: 'Obuna ma\u2018lumotlarini yuklab bo\u2018lmadi', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const currentPlanKey = status?.plan?.key || 'FREE';

  const upgrade = async (planKey: PlanKey) => {
    if (planKey === 'FREE' || planKey === currentPlanKey) return;
    setCheckoutBusy(planKey);
    try {
      const data = await api<{ payment: { provider: string; externalId: string; checkoutUrl: string } }>(
        '/api/subscription/checkout',
        { method: 'POST', body: JSON.stringify({ planKey }) },
      );
      if (data.payment.provider === 'local') {
        await api(`/api/payments/${data.payment.externalId}/confirm`, { method: 'POST' });
        toast({ title: 'Reja faollashtirildi', description: 'Stripe kaliti bo\u2018lsa real checkout ochiladi (local demo rejim)' });
        const [sub] = await Promise.all([api<SubscriptionStatus>('/api/subscription')]);
        setStatus(sub);
      } else if (data.payment.checkoutUrl) {
        window.location.href = data.payment.checkoutUrl;
      }
    } catch (e) {
      toast({ title: 'Xato', description: e instanceof Error ? e.message : 'To\u2018lov yaratilmadi', variant: 'destructive' });
    } finally {
      setCheckoutBusy(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('profile')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Obuna / Subscription</h1>
        <div className="w-9 md:hidden" />
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary to-brand-600 p-4 text-primary-foreground shadow-lg shadow-primary/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-base font-bold">Joriy reja: {status?.plan?.name || 'Free'}</h2>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/80">
                Bugungi AI xabarlar: {status?.usage.messagesToday ?? 0} / {status?.plan?.aiMessagesPerDay ?? 10}
              </p>
              {status?.subscription?.cancelAtPeriodEnd && (
                <p className="mt-1 text-xs text-primary-foreground/80">
                  Obuna {new Date(status.subscription.currentPeriodEnd).toLocaleDateString('uz-UZ')} sanasida bekor qilinadi.
                </p>
              )}
            </div>

            <div className="space-y-3">
              {plans.map((plan) => {
                const isCurrent = plan.key === currentPlanKey;
                return (
                  <div
                    key={plan.key}
                    className={cn(
                      'rounded-2xl border p-4 shadow-sm transition-all',
                      isCurrent ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border bg-card',
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">{formatPrice(plan.priceCents, plan.currency, plan.interval)}</p>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">JORIY</span>
                      )}
                    </div>

                    <ul className="mt-3 space-y-1.5">
                      {plan.features.slice(0, 6).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div className="rounded-lg bg-accent p-2">AI xabar: {plan.aiMessagesPerDay}/kun</div>
                      <div className="rounded-lg bg-accent p-2">Ovoz: {plan.voiceMinutesPerDay} daq/kun</div>
                    </div>

                    {!isCurrent && plan.key !== 'FREE' && (
                      <button
                        onClick={() => upgrade(plan.key)}
                        disabled={checkoutBusy !== null}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
                      >
                        {checkoutBusy === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {checkoutBusy === plan.key ? 'Yuklanmoqda...' : 'Ushbu rejaga o\u2018tish'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Narxlar va limitlar backend tomonidan tekshiriladi (frontend faqat ko\u2018rsatadi)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
