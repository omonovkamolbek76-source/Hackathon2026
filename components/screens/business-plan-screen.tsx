'use client';

import { useState } from 'react';
import { ArrowLeft, Info, Rocket, Sparkles, Check, FileText, MessageSquare, Download, ChevronRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import type { BusinessPlan } from '@/types';
import { cn } from '@/lib/utils';

const steps = ['G‘oya', 'Bozor', 'Moliyaviy reja'];

export function BusinessPlanScreen() {
  const { navigate } = useApp();
  const [form, setForm] = useState({
    businessName: '',
    audience: '',
    budget: '50000000',
    description: '',
  });
  const [phase, setPhase] = useState<'form' | 'loading' | 'result'>('form');
  const [progress, setProgress] = useState(0);
  const [plan, setPlan] = useState<BusinessPlan | null>(null);

  const handleGenerate = () => {
    if (!form.businessName.trim() || !form.audience.trim() || !form.description.trim()) {
      toast({ title: 'Iltimos, barcha maydonlarni to‘ldiring', description: 'Biznes nomi, auditoriya va tavsif majburiy' });
      return;
    }
    setPhase('loading');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setPlan({
            businessName: form.businessName,
            targetAudience: form.audience,
            budget: parseInt(form.budget) || 50000000,
            description: form.description,
            concept: `${form.businessName} — ekologik toza mahsulotlarni onlayn yetkazib berish xizmati. Biz sifatli, qulay va tezkor xizmat orqali mijozlarga qulaylik yaratamiz.`,
            marketOpportunity:
              "O‘zbekistonda ekologik toza mahsulotlarga talab yildan yilga o‘sib bormoqda. Onlayn savdo ulushi hozir 15% ni tashkil etadi va 2027-yilga borib 35% ga yetishi kutilmoqda.",
            competitors:
              "Asosiy raqobatchilar: Uzum Market, Yandex Market, mahalliy onlayn do‘konlar. Bizning afzalligimiz — ekologik toza mahsulotlar ixtisosligu va tezkor yetkazib berish.",
            marketingPlan:
              "Instagram va Telegram reklama kampaniyalari, influencerlar bilan hamkorlik, SEO optimizatsiya, va mijozlarga sodiqlik dasturi.",
            operationalPlan:
              "Ombor va logistika tizimini yo‘lga qo‘yish, 3-5 yetkazib beruvchi bilan shartnoma tuzish, onlayn platforma ishlab chiqish.",
            financialPlan:
              "Boshlang‘ich mablag‘ 50 mln so‘m. 6 oy ichida o‘zini oqlashi kutilmoqda. Oylik aylanma 30-40 mln so‘m, sof marja 15-20%.",
            expenses:
              "Uskuna: 20 mln, Tovar: 15 mln, Marketing: 5 mln, Ijara: 5 mln, Aylanma mablag‘: 5 mln so‘m.",
            expectedRevenue:
              "Birinchi oy: 15 mln so‘m, 3-oy: 30 mln so‘m, 6-oy: 50 mln so‘m, 12-oy: 100 mln so‘m oylik daromad.",
            breakeven: "Taxminan 6-7 oydan keyin foyda ko‘rish kutilmoqda.",
            nextSteps: [
              "Biznes reja yakuniy ko‘rinishini tayyorlang",
              "Ro‘yxatdan o‘tish va ruxsatnomalarni oling",
              "Yetkazib beruvchilar bilan shartnomalar tuzing",
              "Onlayn platformani ishga tushiring",
              "Marketing kampaniyasini boshlang",
              "Birinchi mijozlarni jalb qiling",
            ],
          });
          setPhase('result');
          toast({ title: 'Rejangiz tayyor!', description: 'AI biznes rejangizni muvaffaqiyatli yaratdi' });
          return 100;
        }
        return p + 2;
      });
    }, 50);
  };

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
        <div className="relative mb-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-12 w-12 text-primary animate-float" />
          </div>
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
        </div>
        <h2 className="text-lg font-bold text-foreground">AI biznesingizni tahlil qilmoqda...</h2>
        <p className="mt-1 text-xs text-muted-foreground">Bu bir necha soniya vaqt oladi</p>
        <div className="mt-6 w-full max-w-xs">
          <Progress value={progress} className="h-2" />
          <div className="mt-2 text-center text-xs font-medium text-primary">{progress}%</div>
        </div>
        <div className="mt-6 space-y-2">
          {['Bozor tahlili', 'Raqobatchilar baholash', 'Moliyaviy reja', 'Marketing strategiyasi'].map((step, i) => (
            <div key={step} className="flex items-center gap-2 text-xs">
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full',
                  progress > (i + 1) * 25 ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'
                )}
              >
                {progress > (i + 1) * 25 ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{i + 1}</span>}
              </div>
              <span className={progress > (i + 1) * 25 ? 'text-foreground' : 'text-muted-foreground'}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'result' && plan) {
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
          <button onClick={() => { setPhase('form'); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
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

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-foreground">Keyingi 30 kunlik reja</h3>
              <div className="space-y-2">
                {plan.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <span className="text-xs text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => toast({ title: 'PDF yuklab olindi', description: 'Biznes reja PDF formatida saqlandi' })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              PDF yuklab olish
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setPhase('form')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <FileText className="h-4 w-4" />
                Rejani tahrirlash
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
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
          <Info className="h-5 w-5" />
        </button>
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        {/* Progress Steps */}
        <div className="mb-5 flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    i === 0 ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'
                  )}
                >
                  {i + 1}
                </div>
                <span className={cn('text-[10px] font-medium', i === 0 ? 'text-primary' : 'text-muted-foreground')}>
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('mx-2 h-0.5 flex-1 rounded-full', i < 0 ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        {/* Intro */}
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary/5 to-accent p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            G‘oyangizni tasvirlang, biz sizga mukammal biznes reja yaratishda yordam beramiz.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">Biznes nomi</label>
            <p className="mb-2 text-[11px] text-muted-foreground">Loyihangiz nomini kiriting</p>
            <Input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="Masalan: EcoBozor"
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">Maqsadli auditoriya</label>
            <p className="mb-2 text-[11px] text-muted-foreground">Mahsulot yoki xizmat kim uchun?</p>
            <Input
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              placeholder="Masalan: 18–35 yoshdagi shaharliklar"
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">Boshlang‘ich budjet</label>
            <p className="mb-2 text-[11px] text-muted-foreground">Taxminiy boshlang‘ich mablag‘ingiz</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="h-12 rounded-xl"
              />
              <span className="shrink-0 text-sm font-medium text-muted-foreground">so‘m</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">Qisqacha g‘oya tavsifi</label>
            <p className="mb-2 text-[11px] text-muted-foreground">G‘oyangizni 2–3 jumlada tushuntiring</p>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Masalan: Biz ekologik toza mahsulotlarni onlayn yetkazib berish xizmatini yo‘lga qo‘ymoqchimiz..."
              className="min-h-[100px] rounded-xl"
            />
          </div>

          <button
            onClick={handleGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            Rejani yaratish
          </button>
        </div>
      </div>
    </div>
  );
}
