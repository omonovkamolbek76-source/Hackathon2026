'use client';

import { useState } from 'react';
import { Lightbulb, Store, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useApp } from '@/lib/store';
import { api, ApiError } from '@/lib/client-api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { splitList, validateOnboardingStep, type OnboardingPath } from '@/lib/onboarding';

type Form = {
  businessName: string;
  idea: string;
  industry: string;
  location: string;
  targetCustomer: string;
  product: string;
  marketEntry: string;
  supplierText: string;
  channelText: string;
  tracksFinances: boolean;
  budget: string;
};

const empty: Form = {
  businessName: '',
  idea: '',
  industry: '',
  location: '',
  targetCustomer: '',
  product: '',
  marketEntry: '',
  supplierText: '',
  channelText: '',
  tracksFinances: false,
  budget: '',
};

export function OnboardingScreen() {
  const { refreshGate, navigate, refreshSession } = useApp();
  const [path, setPath] = useState<OnboardingPath | ''>('');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const lastStep = path === 'IDEA' ? 5 : path === 'OPERATING' ? 3 : 0;

  const patch = (key: keyof Form, value: string | boolean) => setForm((p) => ({ ...p, [key]: value }));

  const goNext = () => {
    const err = validateOnboardingStep(step, path, form);
    if (err) {
      toast({ title: err });
      return;
    }
    if (step >= lastStep) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    if (!path) return;
    const err = validateOnboardingStep(step, path, form);
    if (err) {
      toast({ title: err });
      return;
    }
    setSaving(true);
    try {
      await api('/api/onboarding', {
        method: 'PUT',
        body: JSON.stringify({
          path,
          businessName: form.businessName,
          idea: form.idea,
          industry: form.industry,
          location: form.location,
          targetCustomer: form.targetCustomer,
          product: form.product,
          marketEntry: form.marketEntry,
          suppliers: splitList(form.supplierText),
          salesChannels: splitList(form.channelText),
          tracksFinances: path === 'OPERATING' ? form.tracksFinances : false,
          budget: form.budget ? Number(form.budget) : 0,
        }),
      });
      toast({ title: 'Profil saqlandi', description: 'Endi asosiy ilova ochiq. Telegram ulangan bo‘lsa, eslatmalar ketadi.' });
      await refreshSession();
      await refreshGate();
      if (path === 'IDEA') navigate('business-plan');
      else if (form.tracksFinances) navigate('analytics');
      else navigate('home');
    } catch (e) {
      toast({ title: 'Saqlanmadi', description: e instanceof ApiError ? e.message : 'Qayta urinib ko‘ring' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-1 text-[11px] font-medium text-muted-foreground">
          Profil {step + 1}/{lastStep + 1}
        </div>
        <h1 className="text-lg font-bold">Biznesingizni belgilang</h1>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">Bu majburiy. Keyin AI va Telegram shu javoblar asosida yo‘naltiradi.</p>

        {step === 0 && (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setPath('IDEA')}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 text-left',
                path === 'IDEA' ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-semibold">G‘oyam bor</div>
                <div className="text-[11px] text-muted-foreground">Hali ochilmagan. Bozor, mahsulot, qayerda sotish.</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPath('OPERATING')}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 text-left',
                path === 'OPERATING' ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <Store className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-semibold">Ishlab turgan biznes</div>
                <div className="text-[11px] text-muted-foreground">Savdo bor. Mablag‘ hisobi va kunlik maslahat.</div>
              </div>
            </button>
          </div>
        )}

        {path === 'IDEA' && step === 1 && (
          <Field label="G‘oyangiz nima?" hint="2–3 jumla">
            <Textarea value={form.idea} onChange={(e) => patch('idea', e.target.value)} className="min-h-[90px] rounded-xl" placeholder="Masalan: ekologik mahsulotlarni mahallaga yetkazib berish..." />
          </Field>
        )}
        {path === 'IDEA' && step === 2 && (
          <Field label="Kim uchun?" hint="Maqsadli mijoz">
            <Input value={form.targetCustomer} onChange={(e) => patch('targetCustomer', e.target.value)} className="h-11 rounded-xl" placeholder="18–35 yoshdagi shaharliklar" />
          </Field>
        )}
        {path === 'IDEA' && step === 3 && (
          <div className="space-y-3">
            <Field label="Qaysi mahsulot yoki xizmat?" hint="Nima olasiz / sotasaniz">
              <Input value={form.product} onChange={(e) => patch('product', e.target.value)} className="h-11 rounded-xl" placeholder="Masalan: g‘isht, un, yetkazib berish" />
            </Field>
            <Field label="Qayerdan olasiz? (ixtiyoriy)">
              <Input value={form.supplierText} onChange={(e) => patch('supplierText', e.target.value)} className="h-11 rounded-xl" placeholder="Bozor, optom baza — vergul bilan" />
            </Field>
          </div>
        )}
        {path === 'IDEA' && step === 4 && (
          <Field label="Bozorga qanday chiqasiz?" hint="Kanal va usul">
            <Textarea value={form.marketEntry} onChange={(e) => patch('marketEntry', e.target.value)} className="min-h-[90px] rounded-xl" placeholder="Telegram, mahalla, yetkazib berish, do‘kon..." />
          </Field>
        )}
        {path === 'IDEA' && step === 5 && (
          <div className="space-y-3">
            <Field label="Qayerda sotasiz?" hint="Hudud">
              <Input value={form.location} onChange={(e) => patch('location', e.target.value)} className="h-11 rounded-xl" placeholder="Toshkent, Chilonzor" />
            </Field>
            <Field label="Sotuv kanallari (ixtiyoriy)">
              <Input value={form.channelText} onChange={(e) => patch('channelText', e.target.value)} className="h-11 rounded-xl" placeholder="Do‘kon, Telegram, bozor" />
            </Field>
            <Field label="Biznes nomi (ixtiyoriy)">
              <Input value={form.businessName} onChange={(e) => patch('businessName', e.target.value)} className="h-11 rounded-xl" />
            </Field>
          </div>
        )}

        {path === 'OPERATING' && step === 1 && (
          <div className="space-y-3">
            <Field label="Biznes nomi">
              <Input value={form.businessName} onChange={(e) => patch('businessName', e.target.value)} className="h-11 rounded-xl" />
            </Field>
            <Field label="Soha (ixtiyoriy)">
              <Input value={form.industry} onChange={(e) => patch('industry', e.target.value)} className="h-11 rounded-xl" placeholder="Savdo, ishlab chiqarish..." />
            </Field>
          </div>
        )}
        {path === 'OPERATING' && step === 2 && (
          <div className="space-y-3">
            <Field label="Nima sotiladi?">
              <Input value={form.product} onChange={(e) => patch('product', e.target.value)} className="h-11 rounded-xl" />
            </Field>
            <Field label="Qayerdan olasiz? (ixtiyoriy)">
              <Input value={form.supplierText} onChange={(e) => patch('supplierText', e.target.value)} className="h-11 rounded-xl" />
            </Field>
          </div>
        )}
        {path === 'OPERATING' && step === 3 && (
          <div className="space-y-3">
            <Field label="Qayerda sotasiz?">
              <Input value={form.location} onChange={(e) => patch('location', e.target.value)} className="h-11 rounded-xl" />
            </Field>
            <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
              <span>Mablag‘ hisobini yuritaman</span>
              <input type="checkbox" checked={form.tracksFinances} onChange={(e) => patch('tracksFinances', e.target.checked)} className="h-4 w-4 accent-primary" />
            </label>
            <p className="text-[11px] text-muted-foreground">Yoqilsa, kirim-chiqim yozuvlaridan X/Z hisobot va Telegram eslatma chiqadi.</p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl border text-sm font-semibold">
              <ChevronLeft className="h-4 w-4" />
              Orqaga
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={saving || (step === 0 && !path)}
            className="flex h-11 flex-[2] items-center justify-center gap-1 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {step >= lastStep ? (
              <>
                <Check className="h-4 w-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </>
            ) : (
              <>
                Keyingi
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      {hint ? <p className="mb-2 text-[11px] text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}
