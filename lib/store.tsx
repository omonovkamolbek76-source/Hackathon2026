'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ScreenId, Task, AIMessage } from '@/types';
import { demoTasks } from '@/data/mock';

interface AppStore {
  screen: ScreenId;
  navigate: (screen: ScreenId) => void;
  goBack: () => void;
  history: ScreenId[];
  tasks: Task[];
  toggleTask: (id: string) => void;
  chatMessages: AIMessage[];
  addChatMessage: (msg: AIMessage) => void;
  resetChat: () => void;
  creditFlowStep: number;
  setCreditFlowStep: (step: number) => void;
  creditFlowAnswers: Record<string, string>;
  setCreditFlowAnswer: (key: string, value: string) => void;
  selectedCreditIds: string[];
  toggleSelectedCredit: (id: string) => void;
  actionSheetOpen: boolean;
  setActionSheetOpen: (open: boolean) => void;
}

const AppContext = createContext<AppStore | null>(null);

const initialChatMessages: AIMessage[] = [
  {
    id: 'm0',
    role: 'assistant',
    content:
      "Salom! Men — TadbirkorAI, sizning shaxsiy biznes maslahatchingizman. Biznes g'oyangizni rivojlantirish, kredit topish, reja tuzish va biznesingizni tahlil qilishda yordam beraman. Qanday savolingiz bor?",
    quickReplies: ['Kredit topish', 'Biznes g‘oya', 'Bozor tahlili', 'Reklama rejasi', 'Biznes reja'],
    timestamp: Date.now(),
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [history, setHistory] = useState<ScreenId[]>(['home']);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>(initialChatMessages);
  const [creditFlowStep, setCreditFlowStep] = useState(0);
  const [creditFlowAnswers, setCreditFlowAnswers] = useState<Record<string, string>>({});
  const [selectedCreditIds, setSelectedCreditIds] = useState<string[]>([]);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const navigate = useCallback((s: ScreenId) => {
    setScreen(s);
    setHistory((h) => [...h, s]);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const newHistory = [...h];
      newHistory.pop();
      setScreen(newHistory[newHistory.length - 1]);
      return newHistory;
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              status: !t.completed ? 'completed' : 'today',
            }
          : t
      )
    );
  }, []);

  const addChatMessage = useCallback((msg: AIMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const resetChat = useCallback(() => {
    setChatMessages(initialChatMessages);
  }, []);

  const setCreditFlowAnswer = useCallback((key: string, value: string) => {
    setCreditFlowAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSelectedCredit = useCallback((id: string) => {
    setSelectedCreditIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        screen,
        navigate,
        goBack,
        history,
        tasks,
        toggleTask,
        chatMessages,
        addChatMessage,
        resetChat,
        creditFlowStep,
        setCreditFlowStep,
        creditFlowAnswers,
        setCreditFlowAnswer,
        selectedCreditIds,
        toggleSelectedCredit,
        actionSheetOpen,
        setActionSheetOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
