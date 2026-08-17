'use client';

import { useEffect, useState } from 'react';
import { MessageCircleQuestion, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SurveyState = {
  done: boolean;
  dismissed: boolean;
  step: number;
  total: number;
  question: string | null;
  hint: string | null;
  buttons: string[];
  key: string | null;
};

export function SurveyCard() {
  const [state, setState] = useState<SurveyState | null>(null);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api<SurveyState>('/api/survey')
      .then(setState)
      .catch(() => setState(null));
  };

  useEffect(() => {
    load();
  }, []);

  if (!state || state.done || state.dismissed || !state.question) return null;

  const submit = async (value: string) => {
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      await api('/api/survey', { method: 'POST', body: JSON.stringify({ action: 'answer', value: v }) });
      setCustom('');
      load();
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await api('/api/survey', { method: 'POST', body: JSON.stringify({ action: 'dismiss' }) });
      setState((s) => (s ? { ...s, dismissed: true } : s));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-primary" />
          <div className="text-sm font-bold">Qisqa so‘rovnoma</div>
        </div>
        <button type="button" onClick={dismiss} disabled={busy} className="rounded-full p-1 text-muted-foreground" aria-label="Keyinroq">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {state.step + 1}/{state.total} · javob tugma orqali · yozish ixtiyoriy
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{state.question}</p>
      {state.hint ? <p className="mt-1 text-[11px] text-muted-foreground">{state.hint}</p> : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {state.buttons.map((b) => (
          <button
            key={b}
            type="button"
            disabled={busy}
            onClick={() => submit(b)}
            className={cn(
              'rounded-full border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary',
              'hover:bg-primary/10 disabled:opacity-50',
            )}
          >
            {b}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(custom);
        }}
      >
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Ixtiyoriy: o‘zingiz yozing"
          className="h-10 rounded-xl text-sm"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !custom.trim()}
          className="shrink-0 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          Yuborish
        </button>
      </form>
    </div>
  );
}
