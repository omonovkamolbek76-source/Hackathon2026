'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Clock, Send, Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '@/lib/store';
import type { AIMessage } from '@/types';
import { cn } from '@/lib/utils';
import {
  coachRespond,
  JOURNEY_STAGES,
  matchPrograms,
  isSensitiveRequest,
  sensitiveRefusal,
} from '@/lib/journey';
import {
  monthlyPayment,
  creditLoadCheck,
  estimateTurnoverTax,
  breakEvenMonths,
  parseMillions,
} from '@/lib/finance-tools';

interface FlowStep {
  question: string;
  key: string;
  replies: string[];
}

/** Original credit questionnaire UI — enriched with journey stage 5 tools at the end. */
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
    addChatMessage,
    navigate,
    creditFlowStep,
    setCreditFlowStep,
    creditFlowAnswers,
    setCreditFlowAnswer,
    journeyStage,
    setJourneyStage,
    journeyProfile,
    setJourneyProfile,
    resetChat,
  } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inCreditFlow, setInCreditFlow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  const pushAssistant = (content: string, quickReplies?: string[], stage = journeyStage) => {
    addChatMessage({
      id: generateId(),
      role: 'assistant',
      content,
      quickReplies,
      timestamp: Date.now(),
      stage,
      stageName: JOURNEY_STAGES[stage]?.name,
    });
  };

  const startCreditFlow = () => {
    const userMsg: AIMessage = {
      id: generateId(),
      role: 'user',
      content: 'Kredit topish',
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInCreditFlow(true);
    setJourneyStage(5);
    setCreditFlowStep(0);
    setTimeout(() => {
      pushAssistant(creditFlowSteps[0].question, creditFlowSteps[0].replies, 5);
    }, 600);
  };

  const handleFlowReply = (reply: string) => {
    if (!inCreditFlow) {
      addChatMessage({
        id: generateId(),
        role: 'user',
        content: reply,
        timestamp: Date.now(),
      });
      respondToUser(reply);
      return;
    }

    const currentStep = creditFlowSteps[creditFlowStep];
    setCreditFlowAnswer(currentStep.key, reply);
    setJourneyProfile({ [currentStep.key]: reply });

    addChatMessage({
      id: generateId(),
      role: 'user',
      content: reply,
      timestamp: Date.now(),
    });

    const nextStep = creditFlowStep + 1;
    if (nextStep < creditFlowSteps.length) {
      setCreditFlowStep(nextStep);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        pushAssistant(creditFlowSteps[nextStep].question, creditFlowSteps[nextStep].replies, 5);
      }, 800);
      return;
    }

    const answers = { ...creditFlowAnswers, [currentStep.key]: reply };
    const amount = parseMillions(answers.amount || '') ?? 50_000_000;
    const profit = parseMillions(answers.revenue || '') ?? 10_000_000;
    const sampleRate = 22;
    const months = 24;
    const pmt = Math.round(monthlyPayment(amount, sampleRate, months));
    const load = creditLoadCheck(profit, pmt);
    const programs = matchPrograms(journeyProfile.region || '', answers.purpose || '');

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      pushAssistant(
        [
          "Tashakkur! Ma'lumotlaringizni tahlil qildim (namuna hisob — kafolat emas).",
          '',
          `Summa: ${(amount / 1_000_000).toFixed(0)} mln · Muddat: ${months} oy · Namuna foiz: ~${sampleRate}%`,
          `Oylik to‘lov taxminan: ${pmt.toLocaleString('uz-UZ')} so‘m`,
          load.message,
          '',
          programs,
          '',
          "Sizga mos kredit variantlarini tayyorladim. Natijani ko'rish uchun quyidagi tugmani bosing.",
        ].join('\n'),
        undefined,
        5,
      );
      setTimeout(() => {
        pushAssistant('Kredit variantlarini ko‘rish', undefined, 5);
      }, 500);
      setInCreditFlow(false);
      setCreditFlowStep(creditFlowSteps.length);
    }, 1200);
  };

  const respondToUser = (text: string) => {
    if (isSensitiveRequest(text)) {
      const r = sensitiveRefusal();
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setJourneyStage(r.stage);
        pushAssistant(r.message, r.quickReplies, r.stage);
      }, 400);
      return;
    }

    if (/breakeven|chiqish nuqta/i.test(text)) {
      const be = breakEvenMonths(50_000_000, 8_000_000);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        pushAssistant(`${be.message}\nAniqroq model uchun Biznes reja sahifasini to‘ldiring.`, ['Reja yaratish', 'Kredit topish'], 3);
      }, 500);
      return;
    }

    if (/soliq.*hisob|hisob.*soliq|oylik aylanma/i.test(text) || /^(30 mln gacha|30–100 mln|100 mln\+)$/i.test(text)) {
      const rev = /100 mln\+/i.test(text) ? 150_000_000 : /30–100/i.test(text) ? 60_000_000 : 25_000_000;
      const tax = estimateTurnoverTax(rev);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        pushAssistant(
          `Namuna soliq bahosi (~${tax.ratePct}%): ${tax.taxSom.toLocaleString('uz-UZ')} so‘m/oy.\n${tax.note}`,
          ['Kredit topish', 'Biznes reja', 'Monitoring'],
          4,
        );
      }, 500);
      return;
    }

    if (/reja yaratish/i.test(text)) {
      navigate('business-plan');
      return;
    }
    if (/tahlilni ko/i.test(text)) {
      navigate('analytics');
      return;
    }
    if (/vazifalarga/i.test(text)) {
      navigate('tasks');
      return;
    }
    if (/kredit variant|natijani ko/i.test(text)) {
      navigate('credit-matching');
      return;
    }

    const reply = coachRespond(text, journeyStage, journeyProfile);
    setJourneyStage(reply.stage);
    if (/toshkent|samarqand|qarshi|boshqa hudud/i.test(text)) {
      setJourneyProfile({ region: text });
    }
    if (/savdo|xizmat|ishlab|onlayn/i.test(text)) {
      setJourneyProfile({ businessType: text });
    }

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      pushAssistant(reply.message, reply.quickReplies, reply.stage);
      if (reply.navigateTo === 'business-plan') navigate('business-plan');
      if (reply.navigateTo === 'analytics') navigate('analytics');
      if (reply.navigateTo === 'credit-matching') navigate('credit-matching');
    }, 800);
  };

  const handleQuickReply = (reply: string) => {
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
    if (reply === 'Kredit variantlari' || reply === 'Kredit variantlarini ko‘rish') {
      navigate('credit-matching');
      return;
    }

    if (inCreditFlow) {
      handleFlowReply(reply);
      return;
    }

    addChatMessage({
      id: generateId(),
      role: 'user',
      content: reply,
      timestamp: Date.now(),
    });
    setInput('');
    respondToUser(reply);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    if (inCreditFlow) {
      handleFlowReply(text);
      return;
    }
    addChatMessage({
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });
    respondToUser(text);
  };

  return (
    <div className="flex h-screen flex-col animate-fade-in">
      {/* Header — original chrome */}
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
          onClick={resetChat}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground"
          aria-label="Suhbatni yangilash"
          title="Qayta boshlash"
        >
          <Clock className="h-5 w-5" />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {chatMessages.map((msg) => (
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
                        : 'rounded-2xl border border-border bg-card text-foreground'
                    )}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.quickReplies && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.quickReplies.map((reply) => (
                        <button
                          key={reply}
                          onClick={() =>
                            reply === 'Reja yaratish'
                              ? navigate('business-plan')
                              : reply === 'Tahlilni ko‘rish'
                                ? navigate('analytics')
                                : inCreditFlow
                                  ? handleFlowReply(reply)
                                  : handleQuickReply(reply)
                          }
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
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
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
                  <span className="h-2 w-2 animate-thinking rounded-full bg-muted-foreground" style={{ animationDelay: '0s' }} />
                  <span className="h-2 w-2 animate-thinking rounded-full bg-muted-foreground" style={{ animationDelay: '0.2s' }} />
                  <span className="h-2 w-2 animate-thinking rounded-full bg-muted-foreground" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input — original chrome */}
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
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            aria-label="Yuborish"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-primary" />
          Ma&apos;lumotlaringiz himoyalangan
        </div>
      </div>
    </div>
  );
}
