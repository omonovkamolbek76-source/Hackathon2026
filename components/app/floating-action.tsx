'use client';

import { useState } from 'react';
import { Plus, CreditCard, FileText, Wallet, TrendingUp, CheckSquare, Bot, X, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { ScreenId } from '@/types';

interface ActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  screen?: ScreenId;
  txType?: 'income' | 'expense';
  highlight?: boolean;
  color: string;
}

const actions: ActionItem[] = [
  { label: 'Kredit topish', icon: CreditCard, screen: 'credit-matching', highlight: true, color: 'bg-primary text-primary-foreground' },
  { label: 'AI bilan maslahatlashish', icon: Bot, screen: 'ai', color: 'bg-chart-2 text-white' },
  { label: 'Biznes reja yaratish', icon: FileText, screen: 'business-plan', color: 'bg-navy text-white' },
  { label: 'Xarajat qo‘shish', icon: Wallet, txType: 'expense', color: 'bg-chart-4 text-white' },
  { label: 'Daromad qo‘shish', icon: TrendingUp, txType: 'income', color: 'bg-chart-1 text-white' },
  { label: 'Vazifa qo‘shish', icon: CheckSquare, screen: 'tasks', color: 'bg-chart-3 text-white' },
];

export function FloatingActionButton() {
  const { actionSheetOpen, setActionSheetOpen, navigate, addTransaction } = useApp();
  const [txForm, setTxForm] = useState<{ type: 'income' | 'expense'; title: string; amount: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const closeAll = () => {
    setActionSheetOpen(false);
    setTxForm(null);
  };

  const submitTransaction = async () => {
    if (!txForm) return;
    const amount = Number(txForm.amount.replace(/\s/g, ''));
    if (!txForm.title.trim() || !amount || amount <= 0) {
      toast({ title: 'Ma’lumot to‘liq emas', description: 'Nom va summa (0 dan katta) kiriting', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await addTransaction({ title: txForm.title.trim(), amount, type: txForm.type, category: txForm.type === 'income' ? 'sales' : 'ops' });
      toast({ title: txForm.type === 'income' ? 'Daromad qo‘shildi' : 'Xarajat qo‘shildi', description: `${txForm.title}: ${amount.toLocaleString('uz-UZ')} so‘m` });
      closeAll();
    } catch {
      toast({ title: 'Xato', description: 'Saqlab bo‘lmadi, qayta urinib ko‘ring', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setActionSheetOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        aria-label="Tezkor amal"
      >
        <Plus className="h-7 w-7" />
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
      </button>

      {actionSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={closeAll} />
          <div className="relative w-full max-w-md rounded-t-3xl border border-border bg-background p-5 pb-8 animate-slide-up md:rounded-3xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{txForm ? (txForm.type === 'income' ? 'Daromad qo‘shish' : 'Xarajat qo‘shish') : 'Tezkor amallar'}</h2>
              <button onClick={closeAll} className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-muted-foreground" aria-label="Yopish">
                <X className="h-4 w-4" />
              </button>
            </div>

            {txForm ? (
              <div className="space-y-3">
                <input
                  autoFocus
                  value={txForm.title}
                  onChange={(e) => setTxForm({ ...txForm, title: e.target.value })}
                  placeholder="Nomi (masalan: Mahsulot sotish)"
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                />
                <input
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value.replace(/[^\d]/g, '') })}
                  placeholder="Summa (so‘m)"
                  inputMode="numeric"
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                />
                <button
                  onClick={submitTransaction}
                  disabled={submitting}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-60',
                    txForm.type === 'income' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground',
                  )}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Saqlash
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        if (action.txType) {
                          setTxForm({ type: action.txType, title: '', amount: '' });
                        } else if (action.screen) {
                          navigate(action.screen);
                          closeAll();
                        }
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-accent',
                        action.highlight && 'border-2 border-primary/20 bg-primary/5'
                      )}
                    >
                      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', action.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-foreground">{action.label}</div>
                        {action.highlight && (
                          <div className="text-[11px] text-primary">AI sizga mos variantlarni taqqoslaydi</div>
                        )}
                      </div>
                      {action.highlight && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          ASOSIY
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
