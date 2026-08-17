'use client';

import { ArrowLeft, Sparkles, TrendingUp, BarChart3, Star, Bot, FileSpreadsheet, Wallet } from 'lucide-react';
import { useApp } from '@/lib/store';
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

export function AnalyticsScreen() {
  const { navigate, analytics } = useApp();

  const data = analytics || {
    monthlyRevenue: [],
    expenseBreakdown: [],
    netProfit: 0,
    growth: 0,
    topProduct: '—',
    topProductShare: 0,
  };

  const revenueData = data.monthlyRevenue.map((d) => ({
    month: d.month,
    Daromad: d.revenue / 1_000_000,
    Xarajat: d.expense / 1_000_000,
  }));

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button
          onClick={() => navigate('home')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Tahlil</h1>
          <p className="text-[11px] text-muted-foreground">Sizning tranzaksiyalaringiz asosida</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-foreground">
          Oxirgi 6 oy
        </span>
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        {data.today && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">X-hisobot · {data.today.day}</h3>
              </div>
              {data.today.count === 0 ? (
                <p className="text-xs text-muted-foreground">Bugun platformada tranzaksiya yo‘q.</p>
              ) : (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Aylanma</span><span className="font-semibold text-foreground">{formatCurrency(data.today.turnover)}</span></div>
                  <div className="flex justify-between"><span>Xarajat</span><span>{formatCurrency(data.today.expense)}</span></div>
                  <div className="flex justify-between"><span>Sof</span><span className="font-semibold text-foreground">{formatCurrency(data.today.net)}</span></div>
                  <div className="flex justify-between"><span>Operatsiyalar</span><span>{data.today.count} ta</span></div>
                </div>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">Yopilmagan kunlik hisobot. Telegram ulangan bo‘lsa shu raqamlar yuboriladi.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Z-hisobot · {data.today.day}</h3>
              </div>
              {!data.today.zReady ? (
                <p className="text-xs text-muted-foreground">Z-hisobot soat 20:00 (Toshkent) dan keyin yopiladi. Hozir X-hisobot joriy yig‘indi.</p>
              ) : data.today.count === 0 ? (
                <p className="text-xs text-muted-foreground">Bugun yopish uchun yozuv yo‘q.</p>
              ) : (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Aylanma</span><span className="font-semibold text-foreground">{formatCurrency(data.today.turnover)}</span></div>
                  <div className="flex justify-between"><span>Xarajat</span><span>{formatCurrency(data.today.expense)}</span></div>
                  <div className="flex justify-between"><span>Sof</span><span className="font-semibold text-foreground">{formatCurrency(data.today.net)}</span></div>
                </div>
              )}
            </div>
          </div>
        )}

        {data.today && data.today.paymentsDue.length > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold">To‘lovlar va muddatlar</h3>
            </div>
            <ul className="space-y-2">
              {data.today.paymentsDue.map((item) => (
                <li key={`${item.title}-${item.detail}`} className="text-xs">
                  <div className="font-semibold text-foreground">{item.title}</div>
                  {item.detail ? <div className="text-muted-foreground">{item.detail}</div> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.monthlyRevenue.every((m) => m.revenue === 0 && m.expense === 0) && (
          <div className="mb-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Hali ma’lumot yo‘q. Bosh sahifadan kirim/chiqim qo‘shing.
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Sof foyda</div>
              <div className="text-xl font-bold text-foreground">{formatCurrency(data.netProfit)}</div>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Daromad" stroke="hsl(160 100% 33%)" strokeWidth={2} />
                <Line type="monotone" dataKey="Xarajat" stroke="hsl(30 90% 55%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Xarajatlar bo‘linishi</h3>
          </div>
          {data.expenseBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">Xarajatlar yo‘q</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.expenseBreakdown} dataKey="value" nameKey="name" outerRadius={70}>
                    {data.expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Maslahat</h3>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            KPI faqat siz kiritgan tranzaksiyalardan hisoblanadi. Bank/karta integratsiyasi alohida xavfsiz kanal orqali qo‘shiladi.
          </p>
          <button onClick={() => navigate('ai')} className="mt-3 text-xs font-semibold text-primary">
            AI bilan muhokama →
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3" />
          Eng katta xarajat toifasi: {data.topProduct}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Ma’lumotlar hisobingizga tegishli
        </div>
      </div>
    </div>
  );
}
