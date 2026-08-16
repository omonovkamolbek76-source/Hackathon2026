'use client';

import { Bot, FileText, BarChart3, CreditCard, ChevronRight, Bell, ShieldCheck, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { useApp } from '@/lib/store';
import { TopBar } from '@/components/app/top-bar';
import { MetricCard } from '@/components/app/metric-card';
import { QuickActionCard } from '@/components/app/quick-action-card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function HomeScreen() {
  const { navigate, user, kpis, transactions, addTransaction } = useApp();

  return (
    <div className="animate-fade-in">
      <TopBar showLogo />

      <div className="px-4 pb-4 md:px-6">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary to-brand-600 p-4 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Salom, {user?.name?.split(' ')[0] || 'Tadbirkor'}!</h2>
            <p className="mt-1 text-xs text-primary-foreground/80">
              {user?.businessName || 'Biznesingiz'} · {user?.region || 'Hudud kiritilmagan'}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <TrendingUp className="h-7 w-7" />
          </div>
        </div>

        <div className="-mt-2 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {kpis.length > 0 ? (
            kpis.map((kpi) => <MetricCard key={kpi.id} kpi={kpi} />)
          ) : (
            <div className="mt-4 w-full rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
              Hali tranzaksiya yo‘q. Pastdan kirim/chiqim qo‘shing — KPI shu yerda chiqadi.
            </div>
          )}
        </div>

        <div className="mt-3 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-foreground">Sizga mos kreditni toping</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Anketa asosida serverda moslik ballari hisoblanadi. Bu bank kafolati emas.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('credit-matching')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            <Sparkles className="h-4 w-4" />
            Kreditni topish
          </button>
        </div>

        <h3 className="mb-2 mt-5 text-sm font-bold text-foreground">Tezkor amallar</h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <QuickActionCard icon={Bot} title="AI maslahatchi" description="Server orqali murabbiylik" onClick={() => navigate('ai')} theme="green" />
          <QuickActionCard icon={FileText} title="Biznes reja" description="Saqlanadigan reja + eksport" onClick={() => navigate('business-plan')} theme="navy" />
          <QuickActionCard icon={BarChart3} title="Tahlil" description="Sizning tranzaksiyalaringiz" onClick={() => navigate('analytics')} theme="light-green" />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-3.5">
          <div className="mb-2 text-sm font-bold">Tezkor tranzaksiya</div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-primary/10 py-2 text-xs font-semibold text-primary"
              onClick={() =>
                addTransaction({ title: 'Naqd savdo', amount: 500_000, type: 'income', category: 'sales' })
              }
            >
              +500k kirim
            </button>
            <button
              className="flex-1 rounded-xl bg-destructive/10 py-2 text-xs font-semibold text-destructive"
              onClick={() =>
                addTransaction({ title: 'Xarajat', amount: 200_000, type: 'expense', category: 'ops' })
              }
            >
              -200k chiqim
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-foreground">Eslatma</div>
            <div className="text-[11px] text-muted-foreground">Soliq muddatlarini vazifalar bo‘limida kuzating.</div>
          </div>
          <button onClick={() => navigate('tasks')} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-primary">
            Vazifalar
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">So‘nggi faoliyat</h3>
        </div>
        <div className="mt-2 space-y-1.5">
          {transactions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
              Tranzaksiyalar bo‘sh. Yuqoridagi tugmalar bilan boshlang.
            </div>
          )}
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  tx.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
                )}
              >
                {tx.type === 'income' ? <TrendingUp className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{tx.title}</div>
                <div className="text-[11px] text-muted-foreground">{tx.time}</div>
              </div>
              <div className={cn('text-sm font-bold', tx.type === 'income' ? 'text-primary' : 'text-foreground')}>
                {tx.type === 'income' ? '+' : '-'}
                {formatCurrency(tx.amount)}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Ma’lumotlar hisobingizga bog‘langan holda saqlanadi
        </div>
      </div>
    </div>
  );
}
