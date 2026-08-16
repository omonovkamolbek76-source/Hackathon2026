'use client';

import { useState } from 'react';
import { Bot, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';

export function AuthScreen() {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password, mfaCode || undefined);
      } else {
        await register({ email, password, name, businessName, region });
      }
    } catch (err) {
      if (err instanceof ApiError && err.data?.mfaRequired) {
        setMfaRequired(true);
        setError('Authenticator ilovasidagi 6 xonali kodni kiriting');
      } else {
        setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Bot className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">TadbirkorAI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Noldan foydaga — xavfsiz hisob bilan</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex rounded-xl bg-accent p-1">
            <button type="button" onClick={() => setMode('login')} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold', mode === 'login' && 'bg-card shadow-sm')}>
              Kirish
            </button>
            <button type="button" onClick={() => setMode('register')} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold', mode === 'register' && 'bg-card shadow-sm')}>
              Ro‘yxat
            </button>
          </div>

          {mode === 'register' && (
            <>
              <label className="mb-3 block text-xs font-medium text-muted-foreground">
                Ism
                <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </label>
              <label className="mb-3 block text-xs font-medium text-muted-foreground">
                Biznes nomi
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </label>
              <label className="mb-3 block text-xs font-medium text-muted-foreground">
                Hudud
                <input value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </label>
            </>
          )}

          <label className="mb-3 block text-xs font-medium text-muted-foreground">
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
          </label>
          <label className="mb-3 block text-xs font-medium text-muted-foreground">
            Parol {mode === 'register' && '(kamida 8 belgi)'}
            <input
              required
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          {mode === 'login' && (mfaRequired || mfaCode) && (
            <label className="mb-3 block text-xs font-medium text-muted-foreground">
              MFA kod
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                placeholder="123456"
              />
            </label>
          )}

          {error && <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {loading ? 'Kuting...' : mode === 'login' ? 'Kirish' : 'Hisob yaratish'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Parol bcrypt · MFA (TOTP) · httpOnly cookie
        </div>
      </div>
    </div>
  );
}
