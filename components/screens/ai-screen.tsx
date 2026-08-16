'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Clock, Send, Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '@/lib/store';
import type { AIMessage } from '@/types';
import { cn } from '@/lib/utils';

interface FlowStep {
  question: string;
  key: string;
  replies: string[];
}

const creditFlowSteps: FlowStep[] = [
  {
    question: "Albatta, sizga kredit topishda yordam beraman. Avvalo, biznesingiz hozir ishlayaptimi yoki yangi boshlamoqchimisiz?",
    key: 'businessStatus',
    replies: ['Amaldagi biznesim bor', 'Yangi boshlayman', "Hali g'oya bosqichida"],
  },
  {
    question: "Kredit sizga nima uchun kerak?",
    key: 'purpose',
    replies: ['Uskuna', 'Tovar', 'Kengaytirish', 'Aylanma mablag‘', 'Boshqa'],
  },
  {
    question: "Qancha summa kerakligini taxmin qilyapsiz?",
    key: 'amount',
    replies: ['10 mln so‘m', '50 mln so‘m', '100 mln so‘m', '200 mln so‘m'],
  },
  {
    question: "Biznesingizning oylik daromadi qancha?",
    key: 'revenue',
    replies: ['10 mln so‘mgacha', '50 mln so‘m', '100 mln so‘m', '100 mln so‘mdan ortiq'],
  },
  {
    question: "Hozirda boshqa kredit qarzlaringiz bormi?",
    key: 'debt',
    replies: ['Yo‘q, qarz yo‘q', 'Bitta kredit bor', 'Ikki yoki undan ortiq'],
  },
  {
    question: "Oylik qaytarish qobiliyatingizni baholang. Daromadingizning qancha qismini oylik to‘lovga ajrata olasiz?",
    key: 'repayment',
    replies: ['10% gacha', '20% gacha', '30% gacha', '30% dan ortiq'],
  },
];

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export function AIScreen() {
  const { chatMessages, addChatMessage, navigate, creditFlowStep, setCreditFlowStep, creditFlowAnswers, setCreditFlowAnswer } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inCreditFlow, setInCreditFlow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  const handleQuickReply = (reply: string) => {
    if (reply === 'Kredit topish') {
      startCreditFlow();
      return;
    }
    const userMsg: AIMessage = {
      id: generateId(),
      role: 'user',
      content: reply,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInput('');
    respondToUser(reply);
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
    setCreditFlowStep(0);
    setTimeout(() => {
      addChatMessage({
        id: generateId(),
        role: 'assistant',
        content: creditFlowSteps[0].question,
        quickReplies: creditFlowSteps[0].replies,
        timestamp: Date.now(),
      });
    }, 600);
  };

  const handleFlowReply = (reply: string) => {
    const currentStep = creditFlowSteps[creditFlowStep];
    setCreditFlowAnswer(currentStep.key, reply);

    const userMsg: AIMessage = {
      id: generateId(),
      role: 'user',
      content: reply,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);

    const nextStep = creditFlowStep + 1;
    if (nextStep < creditFlowSteps.length) {
      setCreditFlowStep(nextStep);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addChatMessage({
          id: generateId(),
          role: 'assistant',
          content: creditFlowSteps[nextStep].question,
          quickReplies: creditFlowSteps[nextStep].replies,
          timestamp: Date.now(),
        });
      }, 800);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addChatMessage({
          id: generateId(),
          role: 'assistant',
          content:
            "Tashakkur! Ma'lumotlaringizni tahlil qildim. Sizga mos 3 ta kredit variantini tayyorladim. Natijani ko'rish uchun quyidagi tugmani bosing.",
          timestamp: Date.now(),
        });
        setTimeout(() => {
          addChatMessage({
            id: generateId(),
            role: 'assistant',
            content: 'Kredit variantlarini ko‘rish',
            timestamp: Date.now(),
          });
        }, 500);
        setInCreditFlow(false);
      }, 1200);
    }
  };

  const respondToUser = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      let response = '';
      let quickReplies: string[] | undefined;

      if (text.toLowerCase().includes('kredit')) {
        response = "Biznesingizda ayni paytda eng katta muammo nima: moliyalashtirish, savdo, xarajat yoki rivojlanish? Kredit topish uchun men sizga mos variantlarni taqqoslab beraman.";
        quickReplies = ['Kredit topish'];
      } else if (text.toLowerCase().includes('g‘oya') || text.toLowerCase().includes('goya')) {
        response = "Biznes g'oyangiz haqida qisqacha aytib bering — qaysi sohada, kim uchun, qanday qiymat yaratadi? Men sizga to'liq biznes reja tuzishda yordam beraman.";
        quickReplies = ['Biznes reja'];
      } else if (text.toLowerCase().includes('bozor') || text.toLowerCase().includes('tahlil')) {
        response = "Bozor tahlili biznesingizning raqobatbardoshligini baholashga yordam beradi. Qaysi sohada faoliyat yuritasiz?";
        quickReplies = ['Tahlilni ko‘rish'];
      } else if (text.toLowerCase().includes('reklama') || text.toLowerCase().includes('marketing')) {
        response = "Reklama rejasi tuzish uchun: maqsadli auditoriyangiz kim va qaysi kanallarda ular bilan bog'lana olasiz? Men sizga marketing strategiyasini tuzib beraman.";
      } else if (text.toLowerCase().includes('biznes reja') || text.toLowerCase().includes('reja')) {
        response = "Biznes reja yaratish uchun biznes nomi, maqsadli auditoriya va boshlang'ich budjet kerak. Reja yaratish sahifasiga o'tamiz.";
        quickReplies = ['Reja yaratish'];
      } else {
        response = "Tushunarli. Biznesingizda ayni paytda eng katta muammo nima: moliyalashtirish, savdo, xarajat yoki rivojlanish? Aniqroq savol bersangiz, aniqroq yordam bera olaman.";
        quickReplies = ['Kredit topish', 'Biznes reja', 'Bozor tahlili'];
      }

      addChatMessage({
        id: generateId(),
        role: 'assistant',
        content: response,
        quickReplies,
        timestamp: Date.now(),
      });
    }, 800);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    handleQuickReply(input.trim());
    setInput('');
  };

  const lastMessage = chatMessages[chatMessages.length - 1];
  const showFlowReplies = inCreditFlow && lastMessage?.role === 'assistant' && lastMessage.quickReplies;
  const showCreditResultButton =
    !inCreditFlow && creditFlowStep >= creditFlowSteps.length - 1 && lastMessage?.content === "Kredit variantlarini ko'rish";

  return (
    <div className="flex h-screen flex-col animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground md:hidden">
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
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground">
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
                      'rounded-2xl px-3.5 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-foreground'
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
                              : handleFlowReply(reply)
                          }
                          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 active:scale-95"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.content === "Kredit variantlarini ko'rish" && (
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
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-thinking" style={{ animationDelay: '0s' }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-thinking" style={{ animationDelay: '0.2s' }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-thinking" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
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
