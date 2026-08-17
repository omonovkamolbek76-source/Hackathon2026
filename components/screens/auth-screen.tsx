'use client';

import { useEffect, useState } from 'react';
import { Bot, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { OAuthButtons } from '@/components/auth/oauth-buttons';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  cancelled: 'Kirish bekor qilindi',
  invalid_state: 'Sessiya muddati tugagan, qaytadan urinib ko\u2018ring',
  invalid_request: 'Noto\u2018g\u2018ri so\u2018rov, qaytadan urinib ko\u2018ring',
  provider_error: 'Provayder bilan bog\u2018lanishda xatolik, qaytadan urinib ko\u2018ring',
  provider_unavailable: 'Bu usul hozircha mavjud emas',
  rate_limited: 'Juda ko\u2018p urinish. Keyinroq qayta urinib ko\u2018ring',
  email_unavailable: 'Provayder email manzilni taqdim etmadi',
  account_exists_different_method: 'Bu email bilan hisob allaqachon mavjud. Parol bilan kiring, so\u2018ng profildan ulang.',
  email_not_verified: 'Provayderdagi email tasdiqlanmagan',
  linked_to_other_user: 'Bu hisob allaqachon boshqa foydalanuvchiga ulangan',
  link_requires_login: 'Hisob ulash uchun avval tizimga kiring',
};

const OAUTH_LINKED_LABELS: Record<string, string> = {
  google: 'Google hisobi ulandi',
  microsoft: 'Microsoft hisobi ulandi',
};

export function AuthScreen() {
  const { login, register, startOAuth, oauthMfaPending, completeOAuthMfa, oauthError, oauthLinked, clearOAuthNotice } = useApp();
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
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null);
  const [oauthMfaCode, setOauthMfaCode] = useState('');
  const [oauthMfaSubmitting, setOauthMfaSubmitting] = useState(false);
  const [oauthMfaError, setOauthMfaError] = useState('');
  const [oauthProviders, setOauthProviders] = useState({ google: true, microsoft: true });

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((d: { google?: boolean; microsoft?: boolean }) => {
        const google = Boolean(d.google);
        const microsoft = Boolean(d.microsoft);
        if (google || microsoft) setOauthProviders({ google, microsoft });
      })
      .catch(() => undefined);
  }, []);

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

  const handleOAuthClick = (provider: 'google' | 'microsoft') => {
    if (oauthLoading) return; // prevent duplicate OAuth requests from repeated clicks
    setOauthLoading(provider);
    startOAuth(provider);
  };

  const submitOAuthMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setOauthMfaError('');
    setOauthMfaSubmitting(true);
    try {
      await completeOAuthMfa(oauthMfaCode);
    } catch (err) {
      setOauthMfaError(err instanceof ApiError ? err.message : 'Kod noto\u2018g\u2018ri');
    } finally {
      setOauthMfaSubmitting(false);
    }
  };

  if (oauthMfaPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-foreground">Ikki bosqichli tasdiqlash</h1>
            <p className="mt-1 text-xs text-muted-foreground">Authenticator ilovasidagi 6 xonali kodni kiriting</p>
          </div>
          <form onSubmit={submitOAuthMfa}>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={oauthMfaCode}
              onChange={(e) => setOauthMfaCode(e.target.value)}
              placeholder="123456"
              className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center text-sm tracking-widest"
            />
            {oauthMfaError && <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{oauthMfaError}</div>}
            <button
              type="submit"
              disabled={oauthMfaSubmitting || oauthMfaCode.length < 6}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {oauthMfaSubmitting ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
            </button>
          </form>
        </div>
      </div>
    );
  }

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

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          {oauthError && (
            <div className="mb-4 flex items-start justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span>{OAUTH_ERROR_MESSAGES[oauthError] || 'Kirishda xatolik yuz berdi'}</span>
              <button type="button" onClick={clearOAuthNotice} className="shrink-0 font-bold" aria-label="Yopish">
                &times;
              </button>
            </div>
          )}
          {oauthLinked && (
            <div className="mb-4 flex items-start justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
              <span>{OAUTH_LINKED_LABELS[oauthLinked] || 'Hisob ulandi'}</span>
              <button type="button" onClick={clearOAuthNotice} className="shrink-0 font-bold" aria-label="Yopish">
                &times;
              </button>
            </div>
          )}

          {(oauthProviders.google || oauthProviders.microsoft) && (
            <>
              <OAuthButtons
                loading={oauthLoading}
                google={oauthProviders.google}
                microsoft={oauthProviders.microsoft}
                onGoogle={() => handleOAuthClick('google')}
                onMicrosoft={() => handleOAuthClick('microsoft')}
              />

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium uppercase text-muted-foreground">yoki</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={submit}>
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
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Parol bcrypt · Google/Microsoft OAuth · MFA (TOTP) · httpOnly cookie
        </div>
      </div>
    </div>
  );
}
