'use client';

import { ArrowLeft, Sparkles, TrendingUp, BarChart3, Star, Bot, ChevronDown } from 'lucide-react';
import { useApp } from '@/lib/store';
import { demoAnalytics } from '@/data/mock';
import { formatCurrency } from '@/lib/format';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useState } from 'react';

export function AnalyticsScreen() {
  const { navigate } = useApp();
  const [dateRange] = useState('1–31 avgust, 2026');

  const revenueData = demoAnalytics.monthlyRevenue.map((d) => ({
    month: d.month,
    Daromad: d.revenue / 1000000,
    Xarajat: d.expense / 1000000,
  }));

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Tahlil</h1>
          <p className="text-[11px] text-muted-foreground">Biznesingiz ko‘rsatkichlari</p>
        </div>
        <button className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-foreground">
          {dateRange}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        {/* Revenue Chart */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Oylik daromad</h3>
              <div className="mt-1 text-xl font-bold text-foreground">{formatCurrency(demoAnalytics.monthlyRevenue[6].revenue)}</div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              <TrendingUp className="h-3 w-3" />
              +{demoAnalytics.growth}%
            </div>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Aprelga nisbatan +{demoAnalytics.growth}%</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150 15% 90%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(213 12% 45%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(213 12% 45%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(150 15% 90%)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} mln so'm`, '']}
                />
                <Line
                  type="monotone"
                  dataKey="Daromad"
                  stroke="hsl(160 100% 33%)"
                  strokeWidth={2.5}
                  dot={{ fill: 'hsl(160 100% 33%)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Xarajat"
                  stroke="hsl(30 90% 55%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(30 90% 55%)', r: 2 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Daromad</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-chart-4" />
              <span className="text-muted-foreground">Xarajat</span>
            </div>
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-bold text-foreground">Xarajatlar tarkibi</h3>
          <div className="mt-3 flex items-center gap-4">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demoAnalytics.expenseBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={2}
                  >
                    {demoAnalytics.expenseBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(150 15% 90%)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {demoAnalytics.expenseBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="flex-1 text-[11px] text-muted-foreground">{item.name}</span>
                  <span className="text-[11px] font-semibold text-foreground">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="text-[10px] text-muted-foreground">Sof foyda</div>
            <div className="mt-1 text-sm font-bold text-foreground">{formatCurrency(demoAnalytics.netProfit)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="text-[10px] text-muted-foreground">O‘sish</div>
            <div className="mt-1 flex items-center gap-1 text-sm font-bold text-primary">
              <TrendingUp className="h-3 w-3" />
              {demoAnalytics.growth}%
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="text-[10px] text-muted-foreground">Top mahsulot</div>
            <div className="mt-1 text-sm font-bold text-foreground">{demoAnalytics.topProduct}</div>
            <div className="text-[10px] text-muted-foreground">Ulushi {demoAnalytics.topProductShare}%</div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="mt-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">AI tavsiyasi</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            So‘nggi oyda daromadingiz o‘sdi, ammo marketing xarajatlari ham oshgan. Reklama samaradorligini tahlil qilish tavsiya etiladi.
          </p>
          <button
            onClick={() => navigate('ai')}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <Bot className="h-4 w-4" />
            AI bilan tahlil qilish
          </button>
        </div>
      </div>
    </div>
  );
}
