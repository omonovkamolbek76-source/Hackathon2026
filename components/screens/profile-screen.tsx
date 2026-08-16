'use client';

import { ArrowLeft, User, Briefcase, LogOut, ChevronRight, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

export function ProfileScreen() {
  const { navigate, user, logout } = useApp();

  if (!user) return null;

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
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
            {user.name.charAt(0)}
          </div>
          <h2 className="mt-3 text-lg font-bold">{user.name}</h2>
          <p className="text-xs text-primary-foreground/80">
            {user.businessName || 'Biznes nomi yo‘q'} · {user.region || 'Hudud yo‘q'}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground">Email</div>
              <div className="text-sm font-semibold">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground">Telefon</div>
              <div className="text-sm font-semibold">{user.phone || '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground">Hudud</div>
              <div className="text-sm font-semibold">{user.region || '—'}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <button
            onClick={() => toast({ title: 'Profil', description: 'Ma’lumotlar autentifikatsiya orqali himoyalangan' })}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <span className="flex-1 text-left text-sm font-semibold">Profil ma’lumotlari</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate('business-plan')}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="flex-1 text-left text-sm font-semibold">Biznes rejalari</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <button
          onClick={async () => {
            await logout();
            toast({ title: 'Chiqildi', description: 'Sessiya bekor qilindi' });
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 py-3.5 text-sm font-bold text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          httpOnly cookie · bcrypt parol · IDOR himoyasi (userId filtri)
        </div>
        <div className="mt-4 text-center text-[10px] text-muted-foreground">TadbirkorAI v1.1</div>
      </div>
    </div>
  );
}
