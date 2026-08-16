'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { KPI } from '@/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function MetricCard({ kpi }: { kpi: KPI }) {
  const isPositive = kpi.trend >= 0;
  const maxVal = Math.max(...kpi.sparkline);

  return (
    <div className="flex-1 min-w-[140px] rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
        <div
          className={cn(
            'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
            isPositive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          )}
        >
          {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          {Math.abs(kpi.trend)}%
        </div>
      </div>
      <div className="mt-1.5 text-base font-bold text-foreground">{formatCurrency(kpi.value)}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{kpi.trendLabel}</div>
      <div className="mt-2 flex h-8 items-end gap-0.5">
        {kpi.sparkline.map((val, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${(val / maxVal) * 100}%`,
              backgroundColor: kpi.color,
              opacity: 0.3 + (i / kpi.sparkline.length) * 0.7,
            }}
          />
        ))}
      </div>
    </div>
  );
}
