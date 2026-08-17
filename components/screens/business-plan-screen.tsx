'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Info,
  Rocket,
  Sparkles,
  Check,
  FileText,
  MessageSquare,
  Download,
  ChevronRight,
  ChevronLeft,
  FolderOpen,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import type { BusinessPlan } from '@/types';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';
import { ideaStepSchema, marketStepSchema, financeStepSchema } from '@/lib/business-plan';

const steps = ['G‘oya', 'Bozor', 'Moliyaviy reja'];

type FormState = {
  businessName: string;
  audience: string;
  budget: string;
  description: string;
  location: string;
  competitorNote: string;
  monthlyTarget: string;
};

const emptyForm: FormState = {
  businessName: '',
  audience: '',
  budget: '50000000',
  description: '',
  location: '',
  competitorNote: '',
  monthlyTarget: '',
};

type SavedPlanListItem = BusinessPlan & { id: string; createdAt?: string };

export function BusinessPlanScreen() {
  const { navigate } = useApp();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'form' | 'loading' | 'result'>('form');
  const [progress, setProgress] = useState(0);
  const [plan, setPlan] = useState<(BusinessPlan & { id?: string }) | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [savedPlans, setSavedPlans] = useState<SavedPlanListItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const loadSaved = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const data = await api<{ plans: SavedPlanListItem[] }>('/api/business-plans');
      setSavedPlans(data.plans || []);
    } catch {
      setSavedPlans([]);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const patch = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateStep = (n: number): boolean => {
    if (n === 0) {
      const parsed = ideaStepSchema.safeParse({
        businessName: form.businessName,
        description: form.description,
        location: form.location,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] || '');
          if (key && !errs[key]) errs[key] = issue.message;
        }
        setFieldErrors(errs);
        toast({ title: parsed.error.issues[0]?.message || 'Maydonlarni to‘ldiring' });
        return false;
      }
    } else if (n === 1) {
      const parsed = marketStepSchema.safeParse({
        audience: form.audience,
        competitorNote: form.competitorNote,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] || '');
          if (key && !errs[key]) errs[key] = issue.message;
        }
        setFieldErrors(errs);
        toast({ title: parsed.error.issues[0]?.message || 'Maydonlarni to‘ldiring' });
        return false;
      }
    } else {
      const parsed = financeStepSchema.safeParse({
        budget: form.budget,
        monthlyTarget: form.monthlyTarget,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] || '');
          if (key && !errs[key]) errs[key] = issue.message;
        }
        setFieldErrors(errs);
        toast({ title: parsed.error.issues[0]?.message || 'Budjetni tekshiring' });
        return false;
      }
    }
    setFieldErrors({});
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(2, s + 1));
  };

  const handleGenerate = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      setStep(!ideaStepSchema.safeParse({ businessName: form.businessName, description: form.description, location: form.location }).success ? 0 : !marketStepSchema.safeParse({ audience: form.audience, competitorNote: form.competitorNote }).success ? 1 : 2);
      return;
    }
    setPhase('loading');
    setProgress(10);
    const tick = setInterval(() => setProgress((p) => Math.min(90, p + 10)), 120);
    try {
      const data = await api<{ plan: BusinessPlan & { id?: string }; markdown: string }>('/api/business-plans', {
        method: 'POST',
        body: JSON.stringify({
          businessName: form.businessName,
          audience: form.audience,
          budget: Number(form.budget) || 50_000_000,
          description: form.description,
          location: form.location,
          competitorNote: form.competitorNote,
          monthlyTarget: form.monthlyTarget ? Number(form.monthlyTarget) : undefined,
        }),
      });
      setProgress(100);
      setPlan(data.plan);
      setMarkdown(data.markdown);
      setPhase('result');
      toast({ title: 'Rejangiz saqlandi', description: 'Serverda yaratildi va hisobingizga yozildi' });
      loadSaved();
    } catch (e) {
      setPhase('form');
      setProgress(0);
      toast({
        title: 'Xato',
        description: e instanceof ApiError || e instanceof Error ? e.message : 'Reja yaratilmadi',
      });
    } finally {
      clearInterval(tick);
    }
  };

  const openSaved = async (id: string) => {
    try {
      const data = await api<{ plan: BusinessPlan & { id?: string }; markdown: string }>(`/api/business-plans/${id}`);
      setPlan(data.plan);
      setMarkdown(data.markdown);
      setForm({
        businessName: data.plan.businessName || '',
        audience: data.plan.targetAudience || '',
        budget: String(data.plan.budget || ''),
        description: data.plan.description || '',
        location: '',
        competitorNote: '',
        monthlyTarget: '',
      });
      setPhase('result');
    } catch (e) {
      toast({ title: 'Reja ochilmadi', description: e instanceof Error ? e.message : 'Qayta urinib ko‘ring' });
    }
  };

  const downloadMarkdown = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan?.businessName || 'biznes-reja'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Yuklandi', description: 'Markdown fayl saqlandi' });
  };

  const FieldHint = ({ name }: { name: string }) =>
    fieldErrors[name] ? <p className="mt-1 text-[11px] font-medium text-destructive">{fieldErrors[name]}</p> : null;

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
        <div className="relative mb-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-12 w-12 text-primary animate-float" />
          </div>
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
        </div>
        <h2 className="text-lg font-bold text-foreground">Biznesingizni tahlil qilmoqda...</h2>
        <p className="mt-1 text-xs text-muted-foreground">Bu bir necha soniya vaqt oladi</p>
        <div className="mt-6 w-full max-w-xs">
          <Progress value={progress} className="h-2" />
          <div className="mt-2 text-center text-xs font-medium text-primary">{progress}%</div>
        </div>
        <div className="mt-6 space-y-2">
          {['Bozor tahlili', 'SWOT', 'Moliyaviy reja', 'Keyingi qadamlar'].map((label, i) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full',
                  progress > (i + 1) * 25 ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground',
                )}
              >
                {progress > (i + 1) * 25 ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{i + 1}</span>}
              </div>
              <span className={progress > (i + 1) * 25 ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'result' && plan) {
    const nextSteps = Array.isArray(plan.nextSteps) ? plan.nextSteps : [];
    const swot = plan.swot;
    const sections = [
      { title: 'Biznes konsepsiyasi', content: plan.concept },
      { title: 'Maqsadli auditoriya', content: plan.targetAudience },
      { title: 'Bozor imkoniyati', content: plan.marketOpportunity },
      { title: 'Raqobatchilar', content: plan.competitors },
      { title: 'Marketing rejasi', content: plan.marketingPlan },
      { title: 'Operatsion reja', content: plan.operationalPlan },
      { title: 'Moliyaviy reja', content: plan.financialPlan },
      { title: 'Xarajatlar', content: plan.expenses },
      { title: 'Kutilayotgan daromad', content: plan.expectedRevenue },
      { title: 'Breakeven', content: plan.breakeven },
    ];

    return (
      <div className="animate-fade-in">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
          <button
            onClick={() => {
              setPhase('form');
              setStep(0);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">Biznes reja natijasi</h1>
          <div className="w-9" />
        </header>

        <div className="px-4 py-4 pb-20 md:px-6">
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-primary/10 p-3">
            <Check className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-primary">Rejangiz tayyor!</span>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">{plan.businessName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-1.5 text-sm font-bold text-foreground">{section.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{section.content}</p>
              </div>
            ))}

            {swot && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-bold text-foreground">SWOT tahlili</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Kuchli tomonlar', swot.strengths],
                    ['Zaif tomonlar', swot.weaknesses],
                    ['Imkoniyatlar', swot.opportunities],
                    ['Tahdidlar', swot.threats],
                  ].map(([title, items]) => (
                    <div key={title as string} className="rounded-xl bg-accent/60 p-3">
                      <div className="mb-1 text-[11px] font-bold text-foreground">{title}</div>
                      <ul className="space-y-1">
                        {(items as string[]).map((item) => (
                          <li key={item} className="text-[11px] leading-relaxed text-muted-foreground">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-foreground">Keyingi 30 kunlik reja</h3>
              <div className="space-y-2">
                {nextSteps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Keyingi qadamlar yo‘q</p>
                ) : (
                  nextSteps.map((item, i) => (
                    <div key={`${i}-${item}`} className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <span className="text-xs text-foreground">{item}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={downloadMarkdown}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Markdown yuklab olish
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPhase('form');
                  setStep(0);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <FileText className="h-4 w-4" />
                Yangi reja
              </button>
              <button
                onClick={() => navigate('ai')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <MessageSquare className="h-4 w-4" />
                AI bilan muhokama
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Biznes reja</h1>
        <button
          onClick={() =>
            toast({
              title: 'Biznes reja qanday tuziladi?',
              description:
                '3 bosqich: g‘oya, bozor, moliyaviy reja. Siz kiritgan ma’lumot asosida kontseptsiya, SWOT, marketing va moliyaviy reja hisobingizga saqlanadi. Telegram ulangan bo‘lsa SWOT eslatmasi ham ketadi.',
            })
          }
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground"
          aria-label="Ma'lumot"
        >
          <Info className="h-5 w-5" />
        </button>
      </header>

      <div className="px-4 py-4 pb-24 md:px-6">
        <div className="mb-5 flex items-center justify-between">
          {steps.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (i <= step) setStep(i);
                else if (validateStep(step)) setStep(i <= step + 1 ? i : step);
              }}
              className="flex flex-1 items-center"
            >
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-muted-foreground',
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn('text-[10px] font-medium', i <= step ? 'text-primary' : 'text-muted-foreground')}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('mx-2 h-0.5 flex-1 rounded-full', i < step ? 'bg-primary' : 'bg-border')} />
              )}
            </button>
          ))}
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary/5 to-accent p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {step === 0 && 'G‘oyangizni tasvirlang — nom va qisqa tavsif kifoya, keyingi bosqichda bozorni to‘ldiramiz.'}
            {step === 1 && 'Kim uchun va kim bilan raqobatlashasiz? Auditoriya aniq bo‘lsa, SWOT aniqroq chiqadi.'}
            {step === 2 && 'Byudjetni kiriting. Ixtiyoriy oylik maqsad moliyaviy rejani aniqroq qiladi.'}
          </p>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Biznes nomi</label>
              <p className="mb-2 text-[11px] text-muted-foreground">Loyihangiz nomini kiriting</p>
              <Input
                value={form.businessName}
                onChange={(e) => patch('businessName', e.target.value)}
                placeholder="Masalan: EcoBozor"
                className="h-12 rounded-xl"
              />
              <FieldHint name="businessName" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Qisqacha g‘oya tavsifi</label>
              <p className="mb-2 text-[11px] text-muted-foreground">G‘oyangizni 2–3 jumlada tushuntiring</p>
              <Textarea
                value={form.description}
                onChange={(e) => patch('description', e.target.value)}
                placeholder="Masalan: Biz ekologik toza mahsulotlarni onlayn yetkazib berish xizmatini yo‘lga qo‘ymoqchimiz..."
                className="min-h-[100px] rounded-xl"
              />
              <FieldHint name="description" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Hudud (ixtiyoriy)</label>
              <Input
                value={form.location}
                onChange={(e) => patch('location', e.target.value)}
                placeholder="Masalan: Toshkent, Chilonzor"
                className="h-12 rounded-xl"
              />
              <FieldHint name="location" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Maqsadli auditoriya</label>
              <p className="mb-2 text-[11px] text-muted-foreground">Mahsulot yoki xizmat kim uchun?</p>
              <Input
                value={form.audience}
                onChange={(e) => patch('audience', e.target.value)}
                placeholder="Masalan: 18–35 yoshdagi shaharliklar"
                className="h-12 rounded-xl"
              />
              <FieldHint name="audience" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Raqobatchilar haqida izoh (ixtiyoriy)</label>
              <p className="mb-2 text-[11px] text-muted-foreground">Bilgan raqobatchi yoki farqingizni yozing</p>
              <Textarea
                value={form.competitorNote}
                onChange={(e) => patch('competitorNote', e.target.value)}
                placeholder="Masalan: Yaqin do‘konda shu mahsulot qimmatroq, yetkazib berish yo‘q..."
                className="min-h-[80px] rounded-xl"
              />
              <FieldHint name="competitorNote" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Boshlang‘ich budjet</label>
              <p className="mb-2 text-[11px] text-muted-foreground">Taxminiy boshlang‘ich mablag‘ingiz</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={form.budget}
                  onChange={(e) => patch('budget', e.target.value)}
                  className="h-12 rounded-xl"
                />
                <span className="shrink-0 text-sm font-medium text-muted-foreground">so‘m</span>
              </div>
              <FieldHint name="budget" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Oylik sof maqsad (ixtiyoriy)</label>
              <p className="mb-2 text-[11px] text-muted-foreground">Bo‘sh qoldirsangiz, byudjetning 8% i namuna sifatida olinadi</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={form.monthlyTarget}
                  onChange={(e) => patch('monthlyTarget', e.target.value)}
                  placeholder="Masalan: 4000000"
                  className="h-12 rounded-xl"
                />
                <span className="shrink-0 text-sm font-medium text-muted-foreground">so‘m</span>
              </div>
              <FieldHint name="monthlyTarget" />
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Orqaga
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              Keyingi
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              Rejani yaratish
            </button>
          )}
        </div>

        <div className="mt-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <FolderOpen className="h-4 w-4 text-primary" />
            Saqlangan rejalar
          </div>
          {loadingSaved ? (
            <p className="text-xs text-muted-foreground">Yuklanmoqda...</p>
          ) : savedPlans.length === 0 ? (
            <p className="text-xs text-muted-foreground">Hali saqlangan reja yo‘q. 3 bosqichni to‘ldirib yarating.</p>
          ) : (
            <div className="space-y-2">
              {savedPlans.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSaved(item.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3 text-left hover:bg-accent"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.businessName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('uz-UZ') : ''}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
