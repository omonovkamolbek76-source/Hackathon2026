'use client';

import { Bot, FileText, BarChart3, CreditCard, ChevronRight, Bell, ShieldCheck, Sparkles, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useApp } from '@/lib/store';
import { TopBar } from '@/components/app/top-bar';
import { MetricCard } from '@/components/app/metric-card';
import { QuickActionCard } from '@/components/app/quick-action-card';
import { demoKPIs, demoTransactions, demoUser } from '@/data/mock';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function HomeScreen() {
  const { navigate } = useApp();

  return (
    <div className="animate-fade-in">
      <TopBar showLogo />

      <div className="px-4 pb-4 md:px-6">
        {/* Greeting */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary to-brand-600 p-4 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Salom, {demoUser.name.split(' ')[0]}!</h2>
            <p className="mt-1 text-xs text-primary-foreground/80">
              Bugun biznesingizni rivojlantirish uchun yangi imkoniyatlar.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <TrendingUp className="h-7 w-7" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="-mt-2 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {demoKPIs.map((kpi) => (
            <MetricCard key={kpi.id} kpi={kpi} />
          ))}
        </div>

        {/* Primary Credit CTA */}
        <div className="mt-3 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-foreground">Sizga mos kreditni toping</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Biznesingiz, maqsadingiz va moliyaviy holatingizga mos kredit variantlarini AI orqali toping.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('credit-matching')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            Kreditni topish
          </button>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">AI sizga mos variantlarni taqqoslaydi</p>
        </div>

        {/* Quick Actions */}
        <h3 className="mb-2 mt-5 text-sm font-bold text-foreground">Tezkor amallar</h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <QuickActionCard
            icon={Bot}
            title="AI maslahatchi"
            description="Savollaringizga AI yordamida javob oling"
            onClick={() => navigate('ai')}
            theme="green"
          />
          <QuickActionCard
            icon={FileText}
            title="Biznes reja"
            description="Yangi biznes rejangizni yarating"
            onClick={() => navigate('business-plan')}
            theme="navy"
          />
          <QuickActionCard
            icon={BarChart3}
            title="Tahlil"
            description="Biznesingiz holatini tahlil qiling"
            onClick={() => navigate('analytics')}
            theme="light-green"
          />
        </div>

        {/* Reminder Card */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-foreground">Eslatma</div>
            <div className="text-[11px] text-muted-foreground">
              Soliq hisobotini topshirish muddati 5 kun ichida yakunlanadi.
            </div>
          </div>
          <button className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-primary">Batafsil</button>
        </div>

        {/* Recent Activity */}
        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">So‘nggi faoliyat</h3>
          <button className="text-xs font-medium text-primary">Barchasi</button>
        </div>
        <div className="mt-2 space-y-1.5">
          {demoTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  tx.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                )}
              >
                {tx.type === 'income' ? <TrendingUp className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{tx.title}</div>
                <div className="text-[11px] text-muted-foreground">{tx.time}</div>
              </div>
              <div
                className={cn(
                  'text-sm font-bold',
                  tx.type === 'income' ? 'text-primary' : 'text-foreground'
                )}
              >
                {tx.type === 'income' ? '+' : '-'}
                {formatCurrency(tx.amount)}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>

        {/* Trust badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Ma&apos;lumotlaringiz himoyalangan
        </div>
      </div>
    </div>
  );
}
