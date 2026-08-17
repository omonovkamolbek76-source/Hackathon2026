'use client';

import { useEffect, useState } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import { useApp } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

export function TelegramGateScreen() {
  const { user, refreshGate } = useApp();
  const [busy, setBusy] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    try {
      const d = await api<{ deepLink: string | null; token: string }>('/api/telegram/link', { method: 'POST' });
      if (d.deepLink) {
        setDeepLink(d.deepLink);
        window.open(d.deepLink, '_blank', 'noopener,noreferrer');
      } else {
        toast({ title: 'Havola ochilmadi', description: 'TELEGRAM_BOT_USERNAME .env da yo‘q' });
      }
    } catch (e) {
      toast({ title: 'Xato', description: e instanceof ApiError ? e.message : 'Ulanmadi' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!deepLink) return undefined;
    const id = setInterval(() => {
      refreshGate();
    }, 2500);
    const timeout = setTimeout(() => setDeepLink(null), 120_000);
    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, [deepLink, refreshGate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Send className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-lg font-bold">Telegram botni ulash shart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.name ? `${user.name}, ` : ''}TadbirkorAI xabarlarini bot orqali olasiz: vazifa, X/Z hisobot, SWOT va to‘lovlar.
          </p>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          Botni ochish
        </button>
        {deepLink && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Telegram ochilmasa{' '}
            <a href={deepLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
              shu havola
            </a>
            . /start bosing — ulash avtomatik.
          </p>
        )}
      </div>
    </div>
  );
}
