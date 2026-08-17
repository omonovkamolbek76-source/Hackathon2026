'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  User,
  Briefcase,
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Download,
  CreditCard,
  Bell,
  Landmark,
  Link2,
  Unlink,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { api } from '@/lib/client-api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function ProfileScreen() {
  const { navigate, user, logout, refreshSession } = useApp();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qr, setQr] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [csvText, setCsvText] = useState('2026-08-01,Naqd savdo,1500000\n2026-08-02,Ijara,-800000');
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; read: boolean }[]>([]);
  const [disableToken, setDisableToken] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', businessName: '', region: '' });
  const [oauthStatus, setOauthStatus] = useState<{
    hasPassword: boolean;
    accounts: { provider: string; email: string }[];
    googleAvailable: boolean;
    microsoftAvailable: boolean;
  } | null>(null);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);

  const loadOAuthStatus = () => {
    api<typeof oauthStatus>('/api/auth/oauth')
      .then((d) => setOauthStatus(d))
      .catch(() => undefined);
  };

  useEffect(() => {
    api<{ enabled: boolean }>('/api/mfa')
      .then((d) => setMfaEnabled(d.enabled))
      .catch(() => undefined);
    api<{ notifications: { id: string; title: string; body: string; read: boolean }[] }>('/api/notifications')
      .then((d) => setNotifications(d.notifications))
      .catch(() => undefined);
    loadOAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const disableMfa = async () => {
    if (disableToken.length < 6) {
      toast({ title: 'Kod kiriting', description: 'MFA o‘chirish uchun 6 xonali kod kerak' });
      return;
    }
    try {
      await api('/api/mfa', { method: 'DELETE', body: JSON.stringify({ token: disableToken }) });
      setMfaEnabled(false);
      setShowDisableForm(false);
      setDisableToken('');
      toast({ title: 'MFA o‘chirildi' });
    } catch (e) {
      toast({ title: 'Xato', description: e instanceof Error ? e.message : 'Kod noto‘g‘ri', variant: 'destructive' });
    }
  };

  const linkProvider = (provider: 'google' | 'microsoft') => {
    if (oauthBusy) return;
    setOauthBusy(provider);
    window.location.href = `/api/auth/${provider}?link=1&redirect=/`;
  };

  const unlinkProvider = async (provider: 'google' | 'microsoft') => {
    setOauthBusy(provider);
    try {
      await api('/api/auth/oauth', { method: 'DELETE', body: JSON.stringify({ provider }) });
      loadOAuthStatus();
      toast({ title: provider === 'google' ? 'Google uzildi' : 'Microsoft uzildi' });
    } catch (e) {
      toast({ title: 'Xato', description: e instanceof Error ? e.message : 'Uzib bo\u2018lmadi', variant: 'destructive' });
    } finally {
      setOauthBusy(null);
    }
  };

  const startEditProfile = () => {
    setProfileForm({
      name: user.name || '',
      phone: user.phone || '',
      businessName: user.businessName || '',
      region: user.region || '',
    });
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    try {
      await api('/api/auth/me', { method: 'PATCH', body: JSON.stringify(profileForm) });
      await refreshSession();
      setEditingProfile(false);
      toast({ title: 'Profil yangilandi' });
    } catch (e) {
      toast({ title: 'Xato', description: e instanceof Error ? e.message : 'Saqlanmadi', variant: 'destructive' });
    }
  };

  const setupMfa = async () => {
    const d = await api<{ qrDataUrl: string }>('/api/mfa', { method: 'POST' });
    setQr(d.qrDataUrl);
    toast({ title: 'MFA', description: 'QR ni Authenticator bilan skanerlang' });
  };

  const confirmMfa = async () => {
    await api('/api/mfa', { method: 'PUT', body: JSON.stringify({ token: mfaToken }) });
    setMfaEnabled(true);
    setQr('');
    toast({ title: 'MFA yoqildi' });
  };

  const importCsv = async () => {
    const d = await api<{ created: number; skipped: number }>('/api/bank', {
      method: 'PUT',
      body: JSON.stringify({ csv: csvText }),
    });
    toast({ title: 'CSV import', description: `${d.created} qo‘shildi, ${d.skipped} o‘tkazib yuborildi` });
  };

  const startPayment = async () => {
    const d = await api<{ payment: { checkoutUrl: string; provider: string; id: string; externalId: string } }>(
      '/api/payments',
      { method: 'POST', body: JSON.stringify({ amount: 99_000, purpose: 'Pro obuna (oylik)' }) },
    );
    if (d.payment.provider === 'local') {
      await api(`/api/payments/${d.payment.externalId}/confirm`, { method: 'POST' });
      toast({ title: 'Local to‘lov tasdiqlandi', description: 'Stripe kaliti bo‘lsa real checkout ochiladi' });
    } else if (d.payment.checkoutUrl) {
      window.location.href = d.payment.checkoutUrl;
    }
  };

  const exportData = async () => {
    const d = await api<Record<string, unknown>>('/api/export');
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tadbirkorai-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Profil</h1>
        <div className="w-9 md:hidden" />
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary to-brand-600 p-6 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">{user.name.charAt(0)}</div>
          <h2 className="mt-3 text-lg font-bold">{user.name}</h2>
          <p className="text-xs text-primary-foreground/80">
            {user.businessName || 'Biznes nomi yo‘q'} · {user.region || 'Hudud yo‘q'}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-[11px] text-muted-foreground">Email</div>
              <div className="text-sm font-semibold">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-[11px] text-muted-foreground">Telefon</div>
              <div className="text-sm font-semibold">{user.phone || '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-[11px] text-muted-foreground">Hudud</div>
              <div className="text-sm font-semibold">{user.region || '—'}</div>
            </div>
          </div>
        </div>

        {/* Linked accounts */}
        {oauthStatus && (oauthStatus.googleAvailable || oauthStatus.microsoftAvailable || oauthStatus.accounts.length > 0) && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Link2 className="h-4 w-4 text-primary" />
              Ulangan hisoblar
            </div>
            <div className="space-y-2">
              {(['google', 'microsoft'] as const).map((provider) => {
                const available = provider === 'google' ? oauthStatus.googleAvailable : oauthStatus.microsoftAvailable;
                if (!available) return null;
                const linked = oauthStatus.accounts.find((a) => a.provider === provider);
                const label = provider === 'google' ? 'Google' : 'Microsoft';
                return (
                  <div key={provider} className="flex items-center justify-between rounded-xl bg-accent p-2.5">
                    <div className="text-xs">
                      <div className="font-semibold">{label}</div>
                      <div className="text-muted-foreground">{linked ? linked.email || 'Ulangan' : 'Ulanmagan'}</div>
                    </div>
                    {linked ? (
                      <button
                        onClick={() => unlinkProvider(provider)}
                        disabled={oauthBusy === provider}
                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-60"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        Uzish
                      </button>
                    ) : (
                      <button
                        onClick={() => linkProvider(provider)}
                        disabled={oauthBusy === provider}
                        className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-60"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Ulash
                      </button>
                    )}
                  </div>
                );
              })}
              {!oauthStatus.hasPassword && (
                <p className="text-[11px] text-muted-foreground">Parolingiz yo\u2018q — faqat ulangan provayder(lar) orqali kirasiz.</p>
              )}
            </div>
          </div>
        )}

        {/* MFA */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Xavfsizlik / MFA {mfaEnabled ? '· yoqilgan' : '· o‘chiq'}
          </div>
          {!mfaEnabled && !qr && (
            <button onClick={setupMfa} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              MFA yoqish
            </button>
          )}
          {qr && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="MFA QR" className="mx-auto h-40 w-40" />
              <input
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                placeholder="6 xonali kod"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              <button onClick={confirmMfa} className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground">
                Tasdiqlash
              </button>
            </div>
          )}
          {mfaEnabled && !showDisableForm && (
            <button
              onClick={() => setShowDisableForm(true)}
              className="rounded-xl border px-4 py-2 text-xs font-semibold"
            >
              MFA o‘chirish
            </button>
          )}
          {mfaEnabled && showDisableForm && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Tasdiqlash uchun joriy 6 xonali Authenticator kodini kiriting</p>
              <input
                value={disableToken}
                onChange={(e) => setDisableToken(e.target.value)}
                placeholder="6 xonali kod"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button onClick={disableMfa} className="flex-1 rounded-xl bg-destructive py-2 text-xs font-bold text-destructive-foreground">
                  Tasdiqlash va o‘chirish
                </button>
                <button
                  onClick={() => {
                    setShowDisableForm(false);
                    setDisableToken('');
                  }}
                  className="rounded-xl border px-4 py-2 text-xs font-semibold"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bank CSV */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Landmark className="h-4 w-4 text-primary" />
            Bank / CSV import
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">Karta/CVV/OTP saqlanmaydi. Format: sana,tavsif,summa</p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="mb-2 min-h-[80px] w-full rounded-xl border px-3 py-2 text-xs"
          />
          <button onClick={importCsv} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            CSV yuklash
          </button>
        </div>

        {/* Payments */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <CreditCard className="h-4 w-4 text-primary" />
            Obuna / to‘lov
          </div>
          <button onClick={startPayment} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            99 000 so‘m — Pro (local yoki Stripe)
          </button>
        </div>

        {/* Notifications */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Bell className="h-4 w-4 text-primary" />
            Bildirishnomalar
          </div>
          {notifications.length === 0 && <p className="text-xs text-muted-foreground">Hozircha yo‘q</p>}
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="rounded-xl bg-accent p-2.5 text-xs">
                <div className="font-semibold">{n.title}</div>
                <div className="text-muted-foreground">{n.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <button onClick={() => navigate('subscription')} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="flex-1 text-left text-sm font-semibold">Obuna / Subscription</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button onClick={() => navigate('business-plan')} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="flex-1 text-left text-sm font-semibold">Biznes rejalari</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button onClick={exportData} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
            <Download className="h-5 w-5 text-primary" />
            <span className="flex-1 text-left text-sm font-semibold">Ma’lumotlarni eksport</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => (editingProfile ? setEditingProfile(false) : startEditProfile())}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
          >
            <User className="h-5 w-5 text-primary" />
            <span className="flex-1 text-left text-sm font-semibold">Profil ma’lumotlari</span>
            <ChevronRight className={cn('h-5 w-5 text-muted-foreground transition-transform', editingProfile && 'rotate-90')} />
          </button>
        </div>

        {editingProfile && (
          <div className="mt-2 space-y-2 rounded-2xl border border-border bg-card p-4">
            <input
              value={profileForm.name}
              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ism"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <input
              value={profileForm.phone}
              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Telefon"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <input
              value={profileForm.businessName}
              onChange={(e) => setProfileForm((f) => ({ ...f, businessName: e.target.value }))}
              placeholder="Biznes nomi"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <input
              value={profileForm.region}
              onChange={(e) => setProfileForm((f) => ({ ...f, region: e.target.value }))}
              placeholder="Hudud"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <button onClick={saveProfile} className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground">
              Saqlash
            </button>
          </div>
        )}

        <button
          onClick={async () => {
            await logout();
            toast({ title: 'Chiqildi' });
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 py-3.5 text-sm font-bold text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>

        <div className="mt-4 text-center text-[10px] text-muted-foreground">
          MFA · Audit log · CSV bank · Payments · Export · Backup script
        </div>
      </div>
    </div>
  );
}
