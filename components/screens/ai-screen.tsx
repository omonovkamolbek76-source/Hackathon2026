'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Clock, Send, Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  monthlyPayment,
  creditLoadCheck,
  estimateTurnoverTax,
  breakEvenMonths,
  parseMillions,
} from '@/lib/finance-tools';
import { matchPrograms } from '@/lib/journey';

interface FlowStep {
  question: string;
  key: string;
  replies: string[];
}

const creditFlowSteps: FlowStep[] = [
  {
    question:
      'Albatta, sizga kredit topishda yordam beraman. Avvalo, biznesingiz hozir ishlayaptimi yoki yangi boshlamoqchimisiz?',
    key: 'businessStatus',
    replies: ['Amaldagi biznesim bor', 'Yangi boshlayman', "Hali g'oya bosqichida"],
  },
  {
    question: 'Kredit sizga nima uchun kerak?',
    key: 'purpose',
    replies: ['Uskuna', 'Tovar', 'Kengaytirish', 'Aylanma mablag‘', 'Boshqa'],
  },
  {
    question: 'Qancha summa kerakligini taxmin qilyapsiz?',
    key: 'amount',
    replies: ['10 mln so‘m', '50 mln so‘m', '100 mln so‘m', '200 mln so‘m'],
  },
  {
    question: 'Biznesingizning oylik daromadi qancha?',
    key: 'revenue',
    replies: ['10 mln so‘mgacha', '50 mln so‘m', '100 mln so‘m', '100 mln so‘mdan ortiq'],
  },
  {
    question: 'Hozirda boshqa kredit qarzlaringiz bormi?',
    key: 'debt',
    replies: ['Yo‘q, qarz yo‘q', 'Bitta kredit bor', 'Ikki yoki undan ortiq'],
  },
  {
    question:
      'Oylik qaytarish qobiliyatingizni baholang. Daromadingizning qancha qismini oylik to‘lovga ajrata olasiz?',
    key: 'repayment',
    replies: ['10% gacha', '20% gacha', '30% gacha', '30% dan ortiq'],
  },
];

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export function AIScreen() {
  const {
    chatMessages,
    navigate,
    creditFlowStep,
    setCreditFlowStep,
    creditFlowAnswers,
    setCreditFlowAnswer,
    journeyProfile,
    setJourneyProfile,
    setJourneyStage,
    resetChat,
    sendCoachMessage,
    runCreditMatch,
  } = useApp();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inCreditFlow, setInCreditFlow] = useState(false);
  const [localExtras, setLocalExtras] = useState<
    { id: string; role: 'user' | 'assistant'; content: string; quickReplies?: string[] }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = [
    ...chatMessages,
    ...localExtras.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      quickReplies: m.quickReplies,
      timestamp: Date.now(),
    })),
  ];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const pushLocal = (role: 'user' | 'assistant', content: string, quickReplies?: string[]) => {
    setLocalExtras((prev) => [...prev, { id: generateId(), role, content, quickReplies }]);
  };

  const startCreditFlow = () => {
    pushLocal('user', 'Kredit topish');
    setInCreditFlow(true);
    setJourneyStage(5);
    setCreditFlowStep(0);
    setTimeout(() => {
      pushLocal('assistant', creditFlowSteps[0].question, creditFlowSteps[0].replies);
    }, 400);
  };

  const finishCreditFlow = async (answers: Record<string, string>) => {
    setIsTyping(true);
    try {
      // persist answers into store first
      Object.entries(answers).forEach(([k, v]) => setCreditFlowAnswer(k, v));
      const products = await runCreditMatch();
      const amount = parseMillions(answers.amount || '') ?? 50_000_000;
      const profit = parseMillions(answers.revenue || '') ?? 10_000_000;
      const top = products[0];
      const rate = top?.interestRate ?? 22;
      const months = top?.termMonths ?? 24;
      const pmt = Math.round(monthlyPayment(amount, rate, months));
      const load = creditLoadCheck(profit, pmt);
      const programs = matchPrograms(journeyProfile.region || '', answers.purpose || '');

      pushLocal(
        'assistant',
        [
          "Tashakkur! Serverda moslik ballari hisoblandi (bu bank qarori emas).",
          '',
          top
            ? `Eng yaxshi moslik: ${top.name} (${top.bank}) — ball ${top.matchScore}`
            : 'Mos mahsulot topilmadi',
          `Namuna oylik to‘lov (~${rate}% / ${months} oy): ${pmt.toLocaleString('uz-UZ')} so‘m`,
          load.message,
          '',
          programs,
          '',
          'Natijani ko‘rish tugmasini bosing.',
        ].join('\n'),
      );
      setTimeout(() => pushLocal('assistant', 'Kredit variantlarini ko‘rish'), 400);
    } catch (e) {
      pushLocal('assistant', e instanceof Error ? e.message : 'Kredit moslashtirishda xato');
    } finally {
      setIsTyping(false);
      setInCreditFlow(false);
      setCreditFlowStep(creditFlowSteps.length);
    }
  };

  const handleFlowReply = async (reply: string) => {
    const currentStep = creditFlowSteps[creditFlowStep];
    const nextAnswers = { ...creditFlowAnswers, [currentStep.key]: reply };
    setCreditFlowAnswer(currentStep.key, reply);
    setJourneyProfile({ [currentStep.key]: reply });
    pushLocal('user', reply);

    const nextStep = creditFlowStep + 1;
    if (nextStep < creditFlowSteps.length) {
      setCreditFlowStep(nextStep);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        pushLocal('assistant', creditFlowSteps[nextStep].question, creditFlowSteps[nextStep].replies);
      }, 500);
      return;
    }
    await finishCreditFlow(nextAnswers);
  };

  const respondToUser = async (text: string) => {
    if (/reja yaratish/i.test(text)) {
      navigate('business-plan');
      return;
    }
    if (/tahlilni ko/i.test(text)) {
      navigate('analytics');
      return;
    }
    if (/kredit variant/i.test(text)) {
      navigate('credit-matching');
      return;
    }
    if (/breakeven|chiqish nuqta/i.test(text)) {
      const be = breakEvenMonths(50_000_000, 8_000_000);
      pushLocal('assistant', `${be.message}\nAniqroq model: Biznes reja sahifasi.`, ['Reja yaratish', 'Kredit topish']);
      return;
    }
    if (/^(30 mln gacha|30–100 mln|100 mln\+)$/i.test(text)) {
      const rev = /100 mln\+/i.test(text) ? 150_000_000 : /30–100/i.test(text) ? 60_000_000 : 25_000_000;
      const tax = estimateTurnoverTax(rev);
      pushLocal(
        'assistant',
        `Namuna soliq bahosi (~${tax.ratePct}%): ${tax.taxSom.toLocaleString('uz-UZ')} so‘m/oy.\n${tax.note}`,
        ['Kredit topish', 'Biznes reja'],
      );
      return;
    }

    setIsTyping(true);
    try {
      await sendCoachMessage(text);
      setLocalExtras([]);
    } catch (e) {
      pushLocal('assistant', e instanceof Error ? e.message : 'AI javob bermadi');
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = async (reply: string) => {
    if (reply === 'Kredit topish') {
      startCreditFlow();
      return;
    }
    if (reply === 'Reja yaratish') {
      navigate('business-plan');
      return;
    }
    if (reply === 'Tahlilni ko‘rish') {
      navigate('analytics');
      return;
    }
    if (inCreditFlow) {
      await handleFlowReply(reply);
      return;
    }
    await respondToUser(reply);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    if (inCreditFlow) {
      await handleFlowReply(text);
      return;
    }
    await respondToUser(text);
  };

  return (
    <div className="flex h-screen flex-col animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button
          onClick={() => navigate('home')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground md:hidden"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">AI maslahatchi</div>
            <div className="flex items-center gap-1 text-[10px] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Onlayn
            </div>
          </div>
        </div>
        <button
          onClick={() => resetChat()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground"
          aria-label="Suhbatni yangilash"
        >
          <Clock className="h-5 w-5" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('flex max-w-[85%] gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <div
                    className={cn(
                      'whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card text-foreground',
                    )}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.quickReplies && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.quickReplies.map((reply) => (
                        <button
                          key={reply}
                          onClick={() => handleQuickReply(reply)}
                          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 active:scale-95"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.content === 'Kredit variantlarini ko‘rish' && (
                    <button
                      onClick={() => navigate('credit-matching')}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
                    >
                      <Sparkles className="h-4 w-4" />
                      Natijani ko‘rish
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-3">
                  <span className="h-2 w-2 animate-thinking rounded-full bg-muted-foreground" />
                  <span className="h-2 w-2 animate-thinking rounded-full bg-muted-foreground" style={{ animationDelay: '0.2s' }} />
                  <span className="h-2 w-2 animate-thinking rounded-full bg-muted-foreground" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Savolingizni yozing..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="Yuborish"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-primary" />
          Server orqali saqlanadi · Karta/OTP so‘ralmaydi
        </div>
      </div>
    </div>
  );
}
