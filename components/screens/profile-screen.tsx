'use client';

import { ArrowLeft, User, Briefcase, CreditCard, Bell, ShieldCheck, Settings, HelpCircle, LogOut, ChevronRight, Mail, Phone, MapPin, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import { demoUser } from '@/data/mock';
import { toast } from '@/hooks/use-toast';

const sections = [
  { icon: User, label: 'Profil ma’lumotlari', color: 'bg-primary/10 text-primary' },
  { icon: Briefcase, label: 'Biznes ma’lumotlari', color: 'bg-navy/10 text-navy' },
  { icon: CreditCard, label: 'Obuna', color: 'bg-chart-2/10 text-chart-2' },
  { icon: Bell, label: 'Bildirishnomalar', color: 'bg-chart-4/10 text-chart-4' },
  { icon: ShieldCheck, label: 'Xavfsizlik', color: 'bg-chart-3/10 text-chart-3' },
  { icon: Settings, label: 'Sozlamalar', color: 'bg-muted text-muted-foreground' },
  { icon: HelpCircle, label: 'Yordam', color: 'bg-accent text-foreground' },
];

export function ProfileScreen() {
  const { navigate } = useApp();

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
        {/* Profile Header */}
        <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary to-brand-600 p-6 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
            {demoUser.name.charAt(0)}
          </div>
          <h2 className="mt-3 text-lg font-bold">{demoUser.name}</h2>
          <p className="text-xs text-primary-foreground/80">{demoUser.businessName} · {demoUser.region}</p>
        </div>

        {/* Contact Info */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground">Email</div>
              <div className="text-sm font-semibold text-foreground">{demoUser.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-foreground">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground">Telefon</div>
              <div className="text-sm font-semibold text-foreground">{demoUser.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-foreground">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground">Hudud</div>
              <div className="text-sm font-semibold text-foreground">{demoUser.region}</div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-5 space-y-1.5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.label}
                onClick={() => toast({ title: section.label, description: 'Bu bo‘lim hozircha demo rejimda' })}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:bg-accent"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${section.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="flex-1 text-left text-sm font-semibold text-foreground">{section.label}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            toast({ title: 'Chiqish', description: 'Demo rejimida hisob yo‘q' });
            navigate('home');
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 py-3.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>

        {/* Trust badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Ma&apos;lumotlaringiz himoyalangan
        </div>

        <div className="mt-4 text-center text-[10px] text-muted-foreground">
          TadbirkorAI v1.0 · Demo rejim
        </div>
      </div>
    </div>
  );
}
